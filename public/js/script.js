document
  .getElementById("interview-form")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    var submitButton = document.getElementById("submit-button");
    var loader = document.getElementById("loader");

    // Меняем текст на кнопке и отображаем лоадер
    submitButton.textContent = "Отправка данных...";
    loader.hidden = false;
    submitButton.disabled = true;

    var formData = new FormData(this);

    fetch("/submit-interview", {
      method: "POST",
      body: formData,
      redirect: "follow",
    })
      .then((response) => {
        // Скрываем лоадер
        loader.hidden = true;

        // Проверяем статус ответа сервера
        if (response.ok) {
          showAlert("success");
        } else {
          showAlert("error");
        }
        return response.text();
      })
      .then((result) => {
        console.log(result);
      })
      .catch((error) => {
        console.error("Ошибка:", error);
        showAlert("error");
      })
      .finally(() => {
        // Возвращаем исходный текст кнопки и делаем её активной
        submitButton.textContent = "Отправить";
        submitButton.disabled = false;
        document.getElementById("interview-form").reset();
      });
  });

function showAlert(type) {
  var popup;
  if (type === "success") {
    popup = createPopup("Данные успешно отправлены", "success-popup");
  } else if (type === "error") {
    popup = createPopup("Произошла ошибка при отправке данных", "error-popup");
  }

  popup.hidden = false;

  setTimeout(() => {
    popup.hidden = true;
  }, 5000);
}

function createPopup(message, id) {
  var existingPopup = document.getElementById(id);
  if (existingPopup) {
    return existingPopup;
  }

  var popup = document.createElement("div");
  popup.id = id;
  popup.className = "popup";
  popup.innerHTML = `<p>${message}</p><button onclick="document.getElementById('${id}').hidden=true">OK</button>`;

  document.body.appendChild(popup);
  return popup;
}
