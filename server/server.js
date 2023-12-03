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

async function authorizeGoogleAPI(scopes) {
  const auth = new google.auth.GoogleAuth({
    keyFile: "server/signinterview-a58d8fb907cf.json",
    scopes: scopes,
  });

  return await auth.getClient();
}

async function uploadFileToDrive(auth, filename, mimetype, filePath) {
  const drive = google.drive({ version: "v3", auth });

  const fileMetadata = { name: filename };
  const media = { mimeType: mimetype, body: fs.createReadStream(filePath) };

  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id",
  });

  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: { role: "reader", type: "anyone" },
  });

  return `https://drive.google.com/uc?id=${file.data.id}`;
}

async function appendDataToSheet(sheets, data) {
  const spreadsheetId = "1njNl2QSZ0H9DamWDafpxmx5KNvo6WUvOGyZk7oJQZgI";
  const range = "Sheet1!A1";

  return await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    resource: { values: [data] },
  });
}

async function createCalendarEvent(auth, eventDetails) {
  const calendar = google.calendar({ version: "v3", auth });

  const event = {
    summary: eventDetails.summary,
    location: eventDetails.location,
    description: eventDetails.description,
    start: { dateTime: eventDetails.startDateTime, timeZone: "Europe/Moscow" },
    end: { dateTime: eventDetails.endDateTime, timeZone: "Europe/Moscow" },
  };

  const calendarId = "classroom107169243385611019012@group.calendar.google.com"; // ID вашего календаря
  return await calendar.events.insert({ calendarId, resource: event });
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
      const driveAuth = await authorizeGoogleAPI([
        "https://www.googleapis.com/auth/drive",
      ]);
      const sheetsAuth = await authorizeGoogleAPI([
        "https://www.googleapis.com/auth/spreadsheets",
      ]);
      const calendarAuth = await authorizeGoogleAPI([
        "https://www.googleapis.com/auth/calendar",
      ]);

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
      await appendDataToSheet(
        google.sheets({ version: "v4", auth: sheetsAuth }),
        data
      );

      const eventDetails = {
        summary: `Собеседование в ${req.body.company}`,
        location: "Online Meeting",
        description: `Ученик: ${req.body.name} ${req.body.surname}`,
        startDateTime: new Date(
          req.body.interview_date + "T" + req.body.interview_time
        ).toISOString(),
        endDateTime: new Date(
          new Date(
            req.body.interview_date + "T" + req.body.interview_time
          ).getTime() +
            30 * 60000
        ).toISOString(), // +30 минут
      };
      await createCalendarEvent(calendarAuth, eventDetails);

      res.status(200).send("Данные, файлы и событие календаря отправлены");
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
