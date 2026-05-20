const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const {createRemoteJWKSet,jwtVerify} = require("jose-cjs")

dotenv.config();

const uri = process.env.MONGODB_URI;
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(new URL(`${process.env.NEXT_PUBLIC_URL}/api/auth/jwks`));

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  if (!token || token === "undefined" || token === "null") {
    return res.status(401).send({ message: "Unauthorized" });
  }

  try {

    const { payload } = await jwtVerify(token, JWKS);
    // console.log(payload);
    next();
    
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized" });
  }
};

async function run() {
  try {
    // await client.connect();
    console.log("MongoDB Connected successfully");

    const db = client.db("docappoint");
    const allAppointmentsCollection = db.collection("all-appointments");
    const bookingCollection = db.collection("bookings");

    app.get("/appointments", async (req, res) => {
      const result = await allAppointmentsCollection.find().toArray();
      res.send(result);
    });

    app.get("/appointments/:appointmentId", verifyToken, async (req, res) => {
      const { appointmentId } = req.params;

      if (!ObjectId.isValid(appointmentId)) {
        return res.status(400).send({ message: "Invalid ID" });
      }

      const query = { _id: new ObjectId(appointmentId) };
      const result = await allAppointmentsCollection.findOne(query);
      res.send(result);
    });

   // boking id

    app.get("/booking/:userId", async (req, res) => {
      const { userId } = req.params;
      const result = await bookingCollection.find({ userId: userId }).toArray();
      res.send(result);
    });

    app.post("/bookings",  async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.delete("/booking/:bookingId", async (req, res) => {
      const { bookingId } = req.params;
      const query = { _id: new ObjectId(bookingId) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/booking/:bookingId", async (req, res) => {
      const { bookingId } = req.params;
      const updatedData = req.body;
      const query = { _id: new ObjectId(bookingId) };
      const updateDoc = { $set: updatedData };
      const result = await bookingCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log("MongoDB Ping Successful");

  } catch (error) {
    console.log(error);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("DocAppoint Server Running");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);  
});

