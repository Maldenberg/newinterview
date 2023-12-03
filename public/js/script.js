document
  .getElementById("interview-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    // Сбор данных из формы
    var formData = new FormData(document.getElementById("interview-form"));

    // Опции для запроса
    var requestOptions = {
      method: "POST",
      body: formData,
      redirect: "follow",
    };

    // Выполнение запроса к серверу
    fetch("/submit-interview", requestOptions)
      .then((response) => response.text())
      .then((result) => console.log(result))
      .catch((error) => console.log("error", error));
  });
