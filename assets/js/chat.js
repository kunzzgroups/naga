(function(){
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const messages = document.getElementById('chatMessages');
  const attachBtn = document.getElementById('chatAttach');
  const fileInput = document.getElementById('chatFileInput');
  const userName = 'TEST';
  let pendingFiles = [];

  if(attachBtn && fileInput){
    attachBtn.addEventListener('click', function(){
      fileInput.click();
    });

    fileInput.addEventListener('change', function(){
      pendingFiles = Array.from(fileInput.files || []);
      if(pendingFiles.length){
        // Send attachment immediately when selected, like a normal live chat upload.
        sendMessage('', pendingFiles);
        pendingFiles = [];
        fileInput.value = '';
      }
    });
  }

  if(form && input && messages){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      const text = input.value.trim();
      if(!text && !pendingFiles.length) return;
      sendMessage(text, pendingFiles);
      input.value = '';
      pendingFiles = [];
      if(fileInput) fileInput.value = '';
    });
  }

  function sendMessage(text, files){
    const bubble = document.createElement('article');
    bubble.className = 'chat-bubble user';

    let html = `<div class="bubble-name">${escapeHtml(userName)}</div>`;
    if(text){
      html += `<p>${escapeHtml(text)}</p>`;
    }

    if(files && files.length){
      html += '<div class="chat-attachments">';
      files.forEach(function(file){
        const fileUrl = URL.createObjectURL(file);
        const fileName = escapeHtml(file.name || 'attachment');
        const fileSize = formatFileSize(file.size || 0);

        if(file.type && file.type.indexOf('image/') === 0){
          html += `
            <a class="chat-attachment image" href="${fileUrl}" target="_blank" rel="noopener">
              <img src="${fileUrl}" alt="${fileName}">
              <span>${fileName}</span>
            </a>`;
        }else{
          html += `
            <a class="chat-attachment file" href="${fileUrl}" target="_blank" rel="noopener" download="${fileName}">
              <span class="file-icon">📄</span>
              <span class="file-info"><b>${fileName}</b><small>${fileSize}</small></span>
            </a>`;
        }
      });
      html += '</div>';
    }

    bubble.innerHTML = html;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
  }

  function formatFileSize(bytes){
    if(!bytes) return '0 KB';
    if(bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];
    });
  }
})();
