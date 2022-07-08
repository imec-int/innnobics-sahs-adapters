import express from "express";
import {pdfHandler} from "./handlers/pdfHandler.js";
import fileUpload from "express-fileupload";
import morgan from "morgan";
import cors from "cors";
import {Routes} from "./handlers/routes.js";

const app = express();

// enable files upload
app.use(fileUpload({
    createParentPath: true
}));

app.use(cors());
app.use(morgan('dev')); //logging HTTP call

// endpoints
app.post(Routes.PARSE_PDF, pdfHandler);

const port = process.env.PORT || 3000;
app.listen(port, () =>
    console.log(`App is listening on port ${port}.`)
);
