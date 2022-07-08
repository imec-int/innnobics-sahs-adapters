import pdfJs from "pdfjs-dist";

const extractRelevantData = async (pageData) => {
    const render_options = {
        normalizeWhitespace: false,
        disableCombineTextItems: false,
    };

    const textContent = await pageData.getTextContent(render_options);

    const items = textContent.items;

    return [
        {
            "code": "0001",
            "name": "Date",
            "value": items[1].str
        },
        {
            "code": "0002",
            "name": "Type",
            "value": items[2].str
        },
        {
            code: "0003",
            "name": "Patient ID",
            "value": items[9].str.split(":")[1].trim()
        }
    ]
}

export const pdfHandler = async (req, res) => {
    try {
        if (!req.files) {
            res.status(400).json({
                status: false,
                message: 'No file uploaded'
            });
        } else {
            const pdfFile = req.files.pdf;

            const doc = await pdfJs.getDocument(pdfFile);

            await doc.getPage(1)
                .then(extractRelevantData)
                .then(data => {
                    res.send({
                        status: true,
                        message: 'File is uploaded',
                        data
                    });
                });
        }
    } catch (err) {
        res.status(500).send(err);
    }
};
