function initSlider(slider){
  let slideIndex=0;
  let slideTimer;
  const slides=slider.querySelectorAll('.slide');
  const dots=slider.querySelectorAll('.dots span');
  if(!slides.length)return;

  function showSlide(index){
    slides[slideIndex].classList.remove('active');
    if(dots[slideIndex])dots[slideIndex].classList.remove('active');
    slideIndex=index;
    slides[slideIndex].classList.add('active');
    if(dots[slideIndex])dots[slideIndex].classList.add('active');
  }

  function startSlider(){
    clearInterval(slideTimer);
    slideTimer=setInterval(()=>showSlide((slideIndex+1)%slides.length),3000);
  }

  dots.forEach((dot,index)=>{
    dot.addEventListener('click',e=>{
      e.stopPropagation();
      showSlide(index);
      startSlider();
    });
  });

  slider.addEventListener('click',()=>{
    showSlide((slideIndex+1)%slides.length);
    startSlider();
  });

  startSlider();
}

document.querySelectorAll('.side-slider').forEach(initSlider);


// Language popup
const langBtn = document.getElementById('langBtn');
const langOverlay = document.getElementById('langOverlay');

function openLangPopup(){
  if(!langOverlay) return;
  langOverlay.classList.add('show');
  langOverlay.setAttribute('aria-hidden','false');
}

function closeLangPopup(){
  if(!langOverlay) return;
  langOverlay.classList.remove('show');
  langOverlay.setAttribute('aria-hidden','true');
}

if(langBtn && langOverlay){
  langBtn.addEventListener('click', openLangPopup);

  langOverlay.addEventListener('click', e => {
    if(e.target === langOverlay) closeLangPopup();
  });

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape') closeLangPopup();
  });

  langOverlay.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', () => {
      langOverlay.querySelectorAll('.lang-option').forEach(item => {
        item.classList.remove('active');
        const check = item.querySelector('span');
        if(check) check.remove();
      });

      btn.classList.add('active');
      if(!btn.querySelector('span')){
        btn.insertAdjacentHTML('beforeend', ' <span>✔</span>');
      }

      closeLangPopup();
    });
  });
}
