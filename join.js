const joinForm = document.getElementById('join-form');

joinForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const username = joinForm.username.value;
    const email = joinForm.email.value;
    const password = joinForm.password.value;
    const passwordConfirm = joinForm.password_confirm.value;

    if (password !== passwordConfirm) {
        alert('Passwords do not match!');
        return;
    }

    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Password:', password);

    // Here you would typically send the data to a server to create a new user.
    // For this example, we'll just log it to the console.
    alert('Account creation attempt for username: ' + username);
    
    // Redirect to login page after successful submission
    window.location.href = 'index.html';
});
