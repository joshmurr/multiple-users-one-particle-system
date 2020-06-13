export function initUi(){
    const menuToggle = document.getElementById('menuToggle');
    const menu = document.getElementsByTagName('nav')[0];
    const arrow = document.getElementById('arrow');

    menuToggle.addEventListener('click', () => {
        menu.classList.toggle('show');
        menuToggle.classList.toggle('slide');
        arrow.classList.toggle('rotate');
    });
}

