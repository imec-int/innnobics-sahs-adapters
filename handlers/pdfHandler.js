const pdfJs = require("pdfjs-dist/legacy/build/pdf.js");

const emptySpaceEntry = item => {
    return item.width === 0 && item.height === 0;
};
const not = (fn) => (val) => !fn(val);

const split = (separator, str) => str.split(separator);

const take = (index, arr) => index < 0 || index >= arr.length ? undefined : arr[index];

const trim = str => str ? str.trim() : str;

const extractRelevantData = async (pageData) => {
    const render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false,
    };

    const textContent = await pageData.getTextContent(render_options);

    const items = textContent.items.filter(not(emptySpaceEntry));

    return [
        {
            "code": "0001",
            "name": "Date",
            "value": items[0].str
        },
        {
            "code": "0002",
            "name": "Type",
            "value": items[1].str
        },
        {
            code: "0003",
            "name": "Patient ID",
            "value": trim(take(1, split(':', items[8].str)))
        }
    ]
}

const pdfDocumentParser = res => (doc) => {
    doc.getPage(1)
        .then(extractRelevantData)
        .then(data => {
            res.send({
                status: true,
                message: 'File is uploaded',
                data
            });
        }).catch(e => {
            console.error(e);
            res.status(500).send("Failed to extract data from the PDF")
    });
};

export const pdfHandler = async (req, res) => {
    if (!req.files) {
        res.status(400).json({
            status: false,
            message: 'No file uploaded'
        });
    } else {
        const pdfFile = req.files.pdf;

        const parsePdfDocument = pdfDocumentParser(res);
        pdfJs.getDocument(pdfFile).promise
            .then(parsePdfDocument)
            .catch(err => {
                res.status(500).send(err);
            });
    }
};
