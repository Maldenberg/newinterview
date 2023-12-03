document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("interview-form");
  const submitButton = document.getElementById("submit-button");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    let isFormValid = true;

    // Проверяем валидность каждого поля
    Array.from(form.elements).forEach((input) => {
      if (input.tagName === "BUTTON") return; // Пропускаем кнопку отправки
      validateInput(input);
      if (!input.checkValidity()) isFormValid = false;
    });

    if (!isFormValid) {
      console.log("Форма заполнена некорректно");
      return; // Прекращаем выполнение функции, если форма невалидна
    }

    // Если форма валидна, продолжаем отправку
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

  // Валидация поля при потере фокуса
  Array.from(form.elements).forEach((input) => {
    input.addEventListener("blur", function () {
      validateInput(this);
    });
  });

  // Функция для валидации отдельного поля
  function validateInput(input) {
    let errorMessage = input.nextElementSibling;
    if (!input.validity.valid) {
      errorMessage.style.display = "block";
      input.classList.add("invalid");
    } else {
      errorMessage.style.display = "none";
      input.classList.remove("invalid");
    }
  }
});
