// Animated Counters for Stats Section
const counters = document.querySelectorAll('.counter');
const speed = 200;

counters.forEach(counter => {
    const updateCount = () => {
        const target = +counter.getAttribute('data-target');
        const count = +counter.innerText;
        const inc = target / speed;

        if (count < target) {
            counter.innerText = Math.ceil(count + inc);
            setTimeout(updateCount, 1);
        } else {
            counter.innerText = target;
        }
    };
    updateCount();
});

// Scroll Reveal Effect
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 50) {
        nav.style.padding = '15px 40px';
        nav.style.background = 'rgba(0,0,0,0.95)';
    } else {
        nav.style.padding = '24px 40px';
        nav.style.background = 'rgba(0,0,0,0.8)';
    }
});