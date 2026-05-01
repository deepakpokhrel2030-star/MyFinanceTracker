(function(){
  const collapseBtn = document.getElementById('collapseBtn');
  const app = document.querySelector('.app');
  const sidebar = document.getElementById('sidebar');

  collapseBtn.addEventListener('click', ()=>{
    app.classList.toggle('collapsed');
  });

  // small screens: toggle sidebar visibility
  function initMobileToggle(){
    if(window.innerWidth <= 900){
      // add hamburger to topbar
      const topbar = document.querySelector('.topbar');
      if(topbar && !document.getElementById('mobileToggle')){
        const btn = document.createElement('button');
        btn.id = 'mobileToggle';
        btn.innerText = '☰';
        btn.style.marginRight = '12px';
        btn.onclick = ()=> sidebar.classList.toggle('open');
        topbar.insertBefore(btn, topbar.firstChild);
      }
    }
  }

  window.addEventListener('resize', initMobileToggle);
  initMobileToggle();
})();
