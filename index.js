const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ccsajyc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//json web token
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try{
        await client.connect();
        const productCollection = client.db('solutya').collection('products');
        const userCollection = client.db('solutya').collection('user');

        app.get('/product', async (req, res) => {
            const result = await productCollection.find().toArray();
            res.send(result);
        });

        //Login User
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
            res.send({ result, token });
        });

        //get all users
        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        //post or upload new product
        app.post('/product', async (req, res) => {
            const item = req.body;
            const query = { email: item.email, name: item.name, price: item.price, quantity: item.quantity, description: item.description, img: item.image };
            const exists = await productCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, item: exists })
            }
            else {
                const result = await productCollection.insertOne(item);
                res.send({ success: true, result });
            }
        });

        //Update product
        app.put('/product/:id', async(req, res) => {
            const id = req.params.id;
            const product = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set:  { name: product.name, price: product.price, quantity: product.quantity, description: product.description}
                
            };
            const result = await productCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        });

        //delete product
        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        });
        //Make editor
        app.put('/user/editor/:email', async(req, res) => {
                const email = req.params.email;
                const filter = {email: email};
                const updateDoc = {
                    $set: {role: 'editor'},
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            });

            //Make admin
            app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const initiator = req.decoded.email;
            const initiatorAccount = await userCollection.findOne({ email: initiator });
            if (initiatorAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                return res.status(403).send({ message: 'Forbidden access' });
            }
        });

        //get an admin
            app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
            })

            //Get Editor
            app.get('/editor/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isEditor = user.role === 'editor';
            res.send({ editor: isEditor })
            })
        //delete user
        app.delete('/user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });

        //Create new user by Admin
        app.post('/user', async (req, res) => {
            const user = req.body;
            const query = { email: user.email, name: user.name, password: user.password};
            const exists = await userCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, user: exists })
            }
            else {
                const result = await userCollection.insertOne(item);
                res.send({ success: true, result });
            }
        });

    }
    finally{}
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Solutya')
});
app.listen(port, () => {
    console.log(`Solutya ${port}`);
});