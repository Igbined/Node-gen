var notification_status = "on"
    var notification = document.getElementById("notification")
    if (notification_status === "on") {
        notification.style.display = 'block'
    }else {
        notification.style.display = 'none'
    }

function getRandomUser() {
    return fetch('https://randomuser.me/api/')
        .then(response => response.json())
        .then(data => {
            const user = data.results[0];
            const country = user.location.country;
            const name = `${user.name.first} ${user.name.last}`;
            const avatar = user.picture.thumbnail;
            return { country, name, avatar };
        })
        .catch(error => {
            console.error('Error fetching random user:', error);
            return { country: 'FallbackCountry', name: 'FallbackName', avatar: '' }; // Use fallback data in case of an error
        });
}

function showNotification(country, name, avatar) {
    const notificationContainer = document.getElementById('notification');
    const notificationContent = document.getElementById('notificationContent');
    const userAvatar = document.getElementById('userAvatar');

    userAvatar.src = avatar;
    notificationContent.innerHTML = `Someone from ${country} named ${name} just voted.`;
    notificationContainer.classList.add('show-notification');

    setTimeout(() => {
        notificationContainer.classList.remove('show-notification');
    }, 5000); // Hide after 5 seconds
}

// Simulate votes with random data every 5 seconds
setInterval(() => {
    getRandomUser().then(userData => {
        showNotification(userData.country, userData.name, userData.avatar);
    });
}, 5000); // Update every 5 seconds