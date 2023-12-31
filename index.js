const express = require("express");
var jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.SECRET_KEY);
const cors = require("cors");
const app = express();
const { MongoClient, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.PASSWORD}@cluster0.3w5podw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);
function verifyjwt(req, res, next) {
  const jwttoken = req.headers.authorization;
  if (!jwttoken) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = jwttoken.split(" ")[1];
  // console.log(token);
  jwt.verify(token, process.env.ACCESS_TOKEN, function (error, decoded) {
    if (error) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
}
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
    const verifyAdmin = async (req, res, next) => {
      const decodedemail = req.decoded.email;
      const query = { email: decodedemail };
      const user = await usercollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden Access" });
      }
      next();
    };
    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
      });
      res.send({ token });
    });
    app.get("/singleuser/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usercollection.find(query).toArray();
      res.send(result);
    });
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
    app.get("/allorderproduct", async (req, res) => {
      const query = {};
      const result = await paymentcollection.find(query).toArray();
      res.send(result);
    });
    app.get("/orderproduct", verifyjwt, async (req, res) => {
      var Query = {};
      const decoded = req.decoded;
      if (req.query.email) {
        Query = {
          email: req.query.email,
        };
      }
      if (decoded.email !== req.query.email) {
        res.status(403).send({ message: "forbiden access" });
      }
      const result = await paymentcollection.find(Query).toArray();
      res.send(result);
    });
    app.get("/sellerproduct", verifyjwt, async (req, res) => {
      var Query = {};
      const decoded = req.decoded;
      const email = req.query.email;
      if (req.query.email) {
        Query = {
          selleremail: email,
        };
      }
      if (decoded.email !== req.query.email) {
        res.status(403).send({ message: "forbiden access" });
      }
      const result = await allproductcollection.find(Query).toArray();
      res.send(result);
    });
    app.get("/alluser", async (req, res) => {
      const Query = {};
      const result = await usercollection.find(Query).toArray();
      res.send(result);
    });
    app.delete("/alluser/:id", verifyjwt, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usercollection.deleteOne(query);
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
    app.put("/user/admin/:id", verifyjwt, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usercollection.updateOne(filter, updatedoc, options);
      res.send(result);
      console.log(result);
    });
    app.get("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usercollection.findOne(query);
      console.log(user);
      res.send({ isAdmin: user?.role === "admin" });
    });
    app.get("/user/sellercheck/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usercollection.findOne(query);
      console.log(user);
      res.send({ isseller: user?.usertype === "Saler" });
    });
    app.get("/user/buyercheck/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usercollection.findOne(query);
      console.log(user);
      if (
        user?.usertype === "Buyer" ||
        user?.hasOwnProperty("usertype") !== true
      ) {
        res.send({ isbuyer: "true" });
      }
      // res.send({ isbuyer: user?.hasOwnProperty("usertype") });
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
    app.get("/cartproduct", verifyjwt, async (req, res) => {
      var Query = {};
      const decoded = req.decoded;
      const email = req.query.email;
      if (req.query.email) {
        Query = {
          customerEmail: email,
        };
      }
      if (decoded.email !== req.query.email) {
        res.status(403).send({ message: "forbiden access" });
      }
      const result = await cartproductcollection.find(Query).toArray();
      res.send(result);
      console.log(result);
    });

    app.delete("/cartproduct/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartproductcollection.deleteOne(query);
      res.send(result);
    });
    app.delete("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allproductcollection.deleteOne(query);
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
      const count = await allproductcollection.estimatedDocumentCount();
      // console.log(count);
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
