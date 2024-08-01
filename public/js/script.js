const checkboxesAvailable = document.querySelectorAll('input[name="booksAvailable"]');
const checkboxesReturn = document.querySelectorAll('input[name="booksReturn"]');

const borrowButton = document.getElementById('borrowButton');
const returnButton = document.getElementById('returnButton');

//an event listener to each checkbox available
checkboxesAvailable.forEach(checkbox => {
    checkbox.addEventListener('click', () => {
        const anyChecked = Array.from(checkboxesAvailable).some(checkbox => checkbox.checked);
        borrowButton.disabled = !anyChecked;
    });
});
//an event listener to each checkbox rented 
checkboxesReturn.forEach(checkbox => {
    checkbox.addEventListener('click', () => {
        const anyChecked = Array.from(checkboxesReturn).some(checkbox => checkbox.checked);
        renturnButton.disabled = !anyChecked;
    });
});
