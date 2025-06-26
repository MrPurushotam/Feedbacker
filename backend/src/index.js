const express = require("express");
const db = require("./libs/connectDb");
const app = express();
const UserRouter = require("./routes/User");
const FormRouter = require("./routes/form");
const QuestionRouter = require("./routes/question");
const ResponseRouter = require("./routes/response");
const cors = require("cors");

require("dotenv").config();
const port = process.env.PORT || 3000;

const corsConfig = {
    origin: (process.env.ALLOWED_ORIGIN ? process.env.ALLOWED_ORIGIN.split(",") : "*"),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}

app.use(cors(corsConfig));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.json({ message: "Api is running" });
});

app.use("/api/v1/user", UserRouter);
app.use("/api/v1/feedback", FormRouter);
app.use("/api/v1/question", QuestionRouter);
app.use("/api/v1/response", ResponseRouter);

(async () => {
    const connected = await db.Connect();
    await db.CreateTable();
    if (!connected) {
        console.error("Failed to connect to the database. Server not started.");
        process.exit(1);
    }
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
})();