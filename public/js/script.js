document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("interview-form");
  const submitButton = form.querySelector('button[type="submit"]'); // добавили эту строку

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    // Теперь мы можем управлять кнопкой "Отправить"
    submitButton.textContent = "Отправка...";
    submitButton.disabled = true;

    const formData = new FormData(form);

    const requestOptions = {
      method: "POST",
      body: formData,
      redirect: "follow",
    };

    // Отправляем запрос на сервер
    fetch("/submit-interview", requestOptions)
      .then((response) => response.text())
      .then((result) => {
        console.log(result);
        submitButton.textContent = "Отправить";
        submitButton.disabled = false;
      })
      .catch((error) => {
        console.error("Ошибка:", error);
        submitButton.textContent = "Отправить";
        submitButton.disabled = false;
      });
  });
});
