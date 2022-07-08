import {pdfHandler} from "./pdfHandler.js";
import express from "express";
import {Routes} from "./routes.js";
import supertest from "supertest";
import * as path from "path";
import fileUpload from "express-fileupload";

const app = express();
app.use(fileUpload({
    createParentPath: true
}));
app.post(Routes.PARSE_PDF, pdfHandler);


describe("Not uploading a PDF file", () => {
    it('should return a http status 400', async () => {
        const response = await supertest(app).post(Routes.PARSE_PDF);

        expect(response.status).toEqual(400);
        expect(response.body).toBe({"status": false, "message": "No file uploaded"});
    });
});

describe("Uploading a valid file", () => {
    const SAMPLE_PDF = path.join(__dirname, 'report1.pdf');

    let response;

    beforeAll(async () => {
        response = await supertest(app)
            .post(Routes.PARSE_PDF)
            .attach('pdf', SAMPLE_PDF);
    });

    it('should return a http status 200', async function () {
        expect(response.status).toBe(200);
    });

    const testCases = [
        {code: "0001", description:	"Date", value: "25/07/2013"},
        {code: "0002", description: "Type", value: "Complex, Hunter"},
        {code: "0003", description: "Patient ID", value: "123455"},
        {code: "0004", description: "DOB", value: "15/12/1922"},
    ]

    test.each(testCases)('should contain the value for code %p', function ({code, description, value}) {
        const entry = response.body?.data?.find(entry => entry.code === code);

        expect(entry).toBeDefined();
        expect(entry.code).toBe(code);
        expect(entry.name).toBe(description);
        expect(entry.value).toBe(value);
    });
})
