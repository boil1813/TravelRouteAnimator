const loginForm = document.getElementById('login-form');

loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const username = loginForm.username.value;
    const password = loginForm.password.value;

    console.log('Username:', username);
    console.log('Password:', password);

    // Here you would typically send the data to a server for authentication.
    // For this example, we'll just log it to the console.
    alert('Login attempt with username: ' + username);
});
