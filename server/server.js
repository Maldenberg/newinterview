const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const fetch = require("node-fetch");
const { google } = require("googleapis");
const moment = require("moment-timezone");

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
  const moscowTimeStart = moment.tz(
    eventDetails.startDateTime,
    "Europe/Moscow"
  );
  const moscowTimeEnd = moment.tz(eventDetails.endDateTime, "Europe/Moscow");

  const event = {
    summary: eventDetails.summary,
    location: eventDetails.location,
    description: eventDetails.description,
    start: { dateTime: moscowTimeStart.format(), timeZone: "Europe/Moscow" },
    end: { dateTime: moscowTimeEnd.format(), timeZone: "Europe/Moscow" },
  };

  const calendarId = "classroom107169243385611019012@group.calendar.google.com";
  return await calendar.events.insert({ calendarId, resource: event });
}

async function sendToTelegram(data, fileUrls) {
  const telegramUrl = `https://api.telegram.org/bot6059408500:AAHEHHEuX82YjH6_phc9PodInsRoql3habk/sendMessage`;
  let fileLinksMessage = "";
  const fileLabels = ["Анкета", "Легенда", "Резюме"];

  fileUrls.forEach((url, index) => {
    if (url) {
      // Проверяем, есть ли ссылка
      const label = fileLabels[index];
      fileLinksMessage += `\n${label}: [${url}](${url})`;
    }
  });

  const message = `Новое собеседование:\n\n Дата и время: ${data.interview_date} ${data.interview_time}\nФИО: ${data.surname} ${data.name} ${data.patronymic}\nТелефон: ${data.phone}\nСсылка на ВК: ${data.vk_link}\nКонтора: ${data.company}\nСсылка на вакансию: ${data.job_link}\nСсылка на собес: ${data.interview_link}\nHR: ${data.hr}\nДоп.инфа: ${data.additional_info}${fileLinksMessage}`;

  await fetch(telegramUrl, {
    method: "POST",
    body: JSON.stringify({
      chat_id: "-1001793764086",
      text: message,
      parse_mode: "Markdown",
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
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
      // Запускаем все асинхронные операции параллельно
      const [driveAuth, sheetsAuth, calendarAuth] = await Promise.all([
        authorizeGoogleAPI(["https://www.googleapis.com/auth/drive"]),
        authorizeGoogleAPI(["https://www.googleapis.com/auth/spreadsheets"]),
        authorizeGoogleAPI(["https://www.googleapis.com/auth/calendar"]),
      ]);

      const fileUploads = req.files
        ? Object.entries(req.files)
            .map(([field, files]) => {
              return files.map((file) => {
                return uploadFileToDrive(
                  driveAuth,
                  file.originalname,
                  file.mimetype,
                  file.path
                );
              });
            })
            .flat()
        : [];

      const fileUrls = await Promise.all(fileUploads);

      const formData = Object.values(req.body);
      const data = [...formData, ...fileUrls];
      const sheetAppend = appendDataToSheet(
        google.sheets({ version: "v4", auth: sheetsAuth }),
        data
      );

      const eventStart =
        req.body.interview_date + "T" + req.body.interview_time;
      const eventEnd = moment(eventStart)
        .add(60, "minutes")
        .format("YYYY-MM-DDTHH:mm:ss");

      const eventDetails = {
        summary: `Собеседование в ${req.body.company}`,
        location: "Online Meeting",
        description: `Ученик: ${req.body.name} ${req.body.surname}`,
        startDateTime: eventStart,
        endDateTime: eventEnd,
      };

      const calendarEvent = createCalendarEvent(calendarAuth, eventDetails);

      // Подождем завершения операций записи в Google Sheets и создания события в календаре
      await Promise.all([sheetAppend, calendarEvent]);

      // Отправляем в Telegram без ожидания завершения
      sendToTelegram(req.body, fileUrls).catch((error) => {
        console.error("Ошибка при отправке в Telegram:", error);
      });

      res
        .status(200)
        .send(
          "Данные, файлы, событие календаря и сообщение в Telegram отправлены"
        );
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
