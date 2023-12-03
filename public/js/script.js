document
  .getElementById("interview-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    // Получаем кнопку и добавляем лоадер
    const submitButton = document.getElementById("submit-button");
    submitButton.innerHTML = "Отправка...";
    submitButton.disabled = true;

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
      .then((result) => {
        console.log(result);
        // Восстановление состояния кнопки после отправки
        submitButton.innerHTML = "Отправить";
        submitButton.disabled = false;
      })
      .catch((error) => {
        console.log("error", error);
        // Восстановление состояния кнопки в случае ошибки
        submitButton.innerHTML = "Отправить";
        submitButton.disabled = false;
      });
  });
