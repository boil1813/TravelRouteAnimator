document.addEventListener('DOMContentLoaded', () => {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const modal = document.getElementById('feedback-modal');
    const modalImg = document.getElementById('modal-img');
    const printIdInput = document.getElementById('print-id');
    const closeButton = document.querySelector('.close-button');
    const feedbackForm = document.getElementById('feedback-form');
    const stars = document.querySelectorAll('.star');
    const ratingInput = document.getElementById('rating');

    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const printId = item.dataset.id;
            const imgSrc = item.dataset.imgSrc;
            
            printIdInput.value = printId;
            modalImg.src = imgSrc;
            modal.style.display = 'block';
        });
    });

    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    stars.forEach(star => {
        star.addEventListener('click', () => {
            const value = parseInt(star.dataset.value);
            ratingInput.value = value;
            stars.forEach(s => s.classList.remove('selected'));
            for (let i = 0; i < value; i++) {
                stars[i].classList.add('selected');
            }
        });
    });

    feedbackForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const printId = feedbackForm.print_id.value;
        const name = feedbackForm.name.value;
        const rating = feedbackForm.rating.value;
        const comments = feedbackForm.comments.value;

        if (rating === '0') {
            alert('Please select a rating.');
            return;
        }

        console.log('Feedback Submitted:');
        console.log('Print ID:', printId);
        console.log('Name:', name);
        console.log('Rating:', rating);
        console.log('Comments:', comments);

        alert('Thank you for your feedback!');
        modal.style.display = 'none';
        feedbackForm.reset();
        stars.forEach(s => s.classList.remove('selected'));
    });
});
