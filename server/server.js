const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const multer = require("multer");
const { google } = require("googleapis");

const app = express();
const upload = multer(); // используем multer для обработки данных формы

// Middleware для разбора JSON и urlencoded данных и обслуживания статических файлов
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

// Функция для авторизации и создания клиента Google Sheets
async function authorize() {
  const auth = new google.auth.GoogleAuth({
    keyFile: "server/signinterview-a58d8fb907cf.json", // Путь к файлу с учетными данными
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });
  return sheets;
}

// Функция для добавления данных в Google Sheets
async function appendDataToSheet(sheets, data) {
  const spreadsheetId = "1njNl2QSZ0H9DamWDafpxmx5KNvo6WUvOGyZk7oJQZgI"; // ID вашей Google таблицы
  const range = "Sheet1!A1"; // Диапазон для добавления данных

  // Проверка наличия данных
  if (data.length === 0 || data.every((item) => item === null || item === "")) {
    throw new Error("Нет данных для отправки в Google Sheets");
  }

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    resource: { values: [data] },
  });

  return response.data;
}

// Маршрут для обработки данных формы и их отправки в Google Sheets
app.post("/submit-interview", upload.none(), async (req, res) => {
  try {
    const sheets = await authorize();
    const data = Object.values(req.body); // Преобразует объект запроса в массив значений

    await appendDataToSheet(sheets, data);
    res.status(200).send("Данные отправлены в Google Sheets");
  } catch (error) {
    console.error("Ошибка при отправке данных в Google Sheets:", error);
    res.status(500).send("Ошибка при обработке запроса");
  }
});

// Маршрут для корневого URL, который отдает index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
