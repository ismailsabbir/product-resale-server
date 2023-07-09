const express = require("express");
require("dotenv").config();
const stripe = require("stripe")(process.env.SECRET_KEY);
const cors = require("cors");
const app = express();
const product = require("./product.json");
const category = require("./category.json");
const { MongoClient, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.PASSWORD}@cluster0.3w5podw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);
async function run() {
  await client.connect();
  try {
    console.log("MongoDb Database Connected");
    const homecategorycollection = client
      .db("product-resale")
      .collection("homecategory");
    const productcollection = client
      .db("product-resale")
      .collection("products");
    const categorycollection = client
      .db("product-resale")
      .collection("category");
    const allproductcollection = client
      .db("product-resale")
      .collection("allproduct");
    const usercollection = client.db("product-resale").collection("userinfo");
    const cartproductcollection = client
      .db("product-resale")
      .collection("cartproduct");
    const buyproduct = client.db("product-resale").collection("buyproduct");
    const paymentcollection = client
      .db("product-resale")
      .collection("payments");
    app.post("/create-payment-intent", async (req, res) => {
      const productinfo = req.body;
      const price = productinfo.totaldoler;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const result = await paymentcollection.insertOne(payment);
      res.send(result);
    });
    app.get("/orderproduct", async (req, res) => {
      const query = {};
      const result = await paymentcollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/orderproduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await paymentcollection.deleteOne(query);
      res.send(result);
    });
    app.post("/buyproduct", async (req, res) => {
      const product = req.body;
      const result = await buyproduct.insertOne(product);
      res.send(product);
    });
    app.get("/buyproduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await buyproduct.find(query).toArray();
      res.send(result);
    });
    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await usercollection.insertOne(user);
      res.send(user);
    });
    app.post("/cartproduct", async (req, res) => {
      const product = req.body;
      const result = await cartproductcollection.insertOne(product);
      res.send(product);
    });
    app.post("/productadd", async (req, res) => {
      const product = req.body;
      const result = await allproductcollection.insertOne(product);
      res.send(product);
    });
    app.get("/cartproduct", async (req, res) => {
      const query = {};
      const cursor = cartproductcollection.find(query);
      const product = await cursor.toArray();
      res.send(product);
    });
    app.delete("/cartproduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartproductcollection.deleteOne(query);
      res.send(result);
    });
    app.get("/allproduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { category_id: id };
      const result = await allproductcollection.find(query).toArray();
      res.send(result);
    });
    app.get("/products", async (req, res) => {
      const query = {};
      const cursor = allproductcollection.find(query);
      const product = await cursor.toArray();
      res.send(product);
    });
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allproductcollection.findOne(query);
      res.send(result);
    });
    app.get("/category", async (req, res) => {
      const query = {};
      const cursor = categorycollection.find(query);
      const category = await cursor.toArray();
      res.send(category);
    });
    app.get("/allcategory", async (req, res) => {
      const query = {};
      const cursor = homecategorycollection.find(query);
      const category = await cursor.toArray(cursor);
      res.send(category);
    });
    app.get("/categoryproduct/:category", async (req, res) => {
      const category = req.params.category;
      const query = { Categories: category };
      const result = allproductcollection.find(query);
      const product = await result.toArray();
      res.send(product);
    });
    app.get("/spcategoryproduct/:category", async (req, res) => {
      const category = req.params.category;
      const categoryid = req.query.id;
      const query = { category_id: categoryid };
      const result = allproductcollection.find(query);
      var product = await result.toArray();
      const data = product.filter((prod) => {
        return prod.Categories === category;
      });
      product = data;
      res.send(product);
    });
    app.get("/priceproduct", async (req, res) => {
      const minprice = parseFloat(req.query.minprice);
      const maxprice = parseFloat(req.query.maxprice);
      const category = req.query.category;
      const servicequery = { Categories: category };
      const servicecursor = allproductcollection.find(servicequery);
      const allservice = await servicecursor.toArray();
      const query = {
        $or: [
          {
            balance: { $gt: minprice, $lt: maxprice },
          },
          {
            balance: { $eq: minprice, $eq: maxprice },
          },
        ],
      };
      const result = allproductcollection.find(query);
      var product = await result.toArray();
      allservice.forEach((options) => {
        const optionbooked = product.filter(
          (book) => book.category_id === options.category_id
        );
        product = optionbooked;
      });
      res.send(product);
    });
    app.get("/sppriceproduct/:id", async (req, res) => {
      const minprice = parseFloat(req.query.minprice);
      const maxprice = parseFloat(req.query.maxprice);
      const category = req.params.id;
      const servicequery = { category_id: category };
      const servicecursor = allproductcollection.find(servicequery);
      const allservice = await servicecursor.toArray();
      const query = {
        $or: [
          {
            balance: { $gt: minprice, $lt: maxprice },
          },
          {
            balance: { $eq: minprice, $eq: maxprice },
          },
        ],
      };
      const result = allproductcollection.find(query);
      var product = await result.toArray();
      allservice.forEach((options) => {
        const optionbooked = product.filter(
          (book) => book.category_id === options.category_id
        );
        product = optionbooked;
      });
      res.send(product);
    });
    app.get("/colorproduct", async (req, res) => {
      const color = req.query.color;
      const colorquery = { color: color };
      const colorproducrcursor = allproductcollection.find(colorquery);
      const colorproduct = await colorproducrcursor.toArray();
      res.send(colorproduct);
    });
    app.get("/spcolorproduct", async (req, res) => {
      const color = req.query.color;
      const categoryid = req.query.id;
      const categoryquery = { category_id: categoryid };
      const categoryproducrcursor = allproductcollection.find(categoryquery);
      var categoryproduct = await categoryproducrcursor.toArray();
      const data = categoryproduct.filter((prod) => {
        return prod.color === color;
      });
      categoryproduct = data;
      res.send(categoryproduct);
    });
    app.get("/asending", async (req, res) => {
      const query = {};
      const cursor = allproductcollection.find(query).sort({ balance: 1 });
      const product = await cursor.toArray();
      res.send(product);
    });
    app.get("/spasending", async (req, res) => {
      const para = req.query.id;
      const query = { category_id: para };
      const cursor = allproductcollection.find(query).sort({ balance: 1 });
      const product = await cursor.toArray();
      res.send(product);
    });
    app.get("/dsending", async (req, res) => {
      const query = {};
      const cursor = allproductcollection.find(query).sort({ balance: -1 });
      const product = await cursor.toArray();
      res.send(product);
    });
    app.get("/spdsending", async (req, res) => {
      const para = req.query.id;
      const query = { category_id: para };
      const cursor = allproductcollection.find(query).sort({ balance: -1 });
      const product = await cursor.toArray();
      res.send(product);
    });
  } catch (error) {
    console.log(error);
  }
}
run();
app.get("/", (req, res) => {
  res.send("Hello Product Resale Server");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
