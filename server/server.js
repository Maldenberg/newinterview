const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const { google } = require("googleapis");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

async function authorizeSheets() {
  const auth = new google.auth.GoogleAuth({
    keyFile: "server/signinterview-a58d8fb907cf.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });
  return sheets;
}

async function authorizeDrive() {
  const auth = new google.auth.GoogleAuth({
    keyFile: "server/signinterview-a58d8fb907cf.json",
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return await auth.getClient();
}

async function uploadFileToDrive(auth, filename, mimetype, filePath) {
  const drive = google.drive({ version: "v3", auth });

  const fileMetadata = {
    name: filename,
  };
  const media = {
    mimeType: mimetype,
    body: fs.createReadStream(filePath),
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id",
  });

  // Настройка разрешений файла
  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  // Возвращение URL файла
  const fileUrl = `https://drive.google.com/uc?id=${file.data.id}`;
  return fileUrl;
}

async function appendDataToSheet(sheets, data) {
  const spreadsheetId = "1njNl2QSZ0H9DamWDafpxmx5KNvo6WUvOGyZk7oJQZgI";
  const range = "Sheet1!A1";

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    resource: { values: [data] },
  });

  return response.data;
}

app.post(
  "/submit-interview",
  upload.fields([
    { name: "application_form", maxCount: 1 },
    { name: "legend_file", maxCount: 1 },
    { name: "resume_file", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const sheets = await authorizeSheets();
      const driveAuth = await authorizeDrive();

      const fileUrls = [];
      for (let field in req.files) {
        const files = req.files[field];
        for (let file of files) {
          const fileUrl = await uploadFileToDrive(
            driveAuth,
            file.originalname,
            file.mimetype,
            file.path
          );
          fileUrls.push(fileUrl);
        }
      }

      const formData = Object.values(req.body);
      const data = [...formData, ...fileUrls];

      await appendDataToSheet(sheets, data);
      res.status(200).send("Данные и файлы отправлены");
    } catch (error) {
      console.error("Ошибка при обработке запроса:", error);
      res.status(500).send("Ошибка сервера");
    }
  }
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
