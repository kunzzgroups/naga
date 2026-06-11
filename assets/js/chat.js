(function(){
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const inputWrap = document.getElementById('chatInputWrap');
  const preview = document.getElementById('chatPastePreview');
  const messages = document.getElementById('chatMessages');
  const attachBtn = document.getElementById('chatAttach');
  const fileInput = document.getElementById('chatFileInput');
  const userName = 'TEST';
  let pendingFiles = [];
  let pendingPreviewUrls = [];

  if(attachBtn && fileInput){
    attachBtn.addEventListener('click', function(){
      fileInput.click();
    });

    fileInput.addEventListener('change', function(){
      addPendingFiles(Array.from(fileInput.files || []));
      fileInput.value = '';
    });
  }

  if(input){
    input.addEventListener('paste', handlePasteFiles);

    input.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        submitChat();
      }
    });
  }

  if(form && input && messages){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      submitChat();
    });
  }

  function submitChat(){
    if(!input || !messages) return;
    const text = input.value.trim();
    if(!text && !pendingFiles.length) return;

    sendMessage(text, pendingFiles);
    input.value = '';
    clearPendingFiles();
  }

  function handlePasteFiles(e){
    const clipboard = e.clipboardData || window.clipboardData;
    if(!clipboard) return;

    const files = [];

    if(clipboard.files && clipboard.files.length){
      files.push.apply(files, Array.from(clipboard.files));
    }

    if(clipboard.items && clipboard.items.length){
      Array.from(clipboard.items).forEach(function(item, index){
        if(item.kind !== 'file') return;
        const file = item.getAsFile();
        if(!file) return;
        files.push(renameClipboardFile(file, index));
      });
    }

    const uniqueFiles = removeDuplicateFiles(files);
    if(uniqueFiles.length){
      e.preventDefault();
      addPendingFiles(uniqueFiles);
      input.focus();
    }
  }

  function addPendingFiles(files){
    if(!files || !files.length) return;
    pendingFiles = pendingFiles.concat(files);
    renderPendingPreview();
  }

  function clearPendingFiles(){
    pendingFiles = [];
    pendingPreviewUrls.forEach(function(url){ URL.revokeObjectURL(url); });
    pendingPreviewUrls = [];
    renderPendingPreview();
  }

  function removePendingFile(index){
    pendingFiles.splice(index, 1);
    renderPendingPreview();
    if(input) input.focus();
  }

  function renderPendingPreview(){
    if(!preview) return;

    pendingPreviewUrls.forEach(function(url){ URL.revokeObjectURL(url); });
    pendingPreviewUrls = [];
    preview.innerHTML = '';

    if(!pendingFiles.length){
      preview.classList.remove('has-files');
      if(inputWrap) inputWrap.classList.remove('has-files');
      return;
    }

    preview.classList.add('has-files');
    if(inputWrap) inputWrap.classList.add('has-files');

    pendingFiles.forEach(function(file, index){
      const chip = document.createElement('div');
      chip.className = 'chat-paste-chip';

      if(file.type && file.type.indexOf('image/') === 0){
        const url = URL.createObjectURL(file);
        pendingPreviewUrls.push(url);
        const img = document.createElement('img');
        img.src = url;
        img.alt = file.name || 'pasted image';
        chip.appendChild(img);
      }else{
        const icon = document.createElement('span');
        icon.className = 'chat-paste-file-icon';
        icon.textContent = '📄';
        chip.appendChild(icon);
      }

      const name = document.createElement('span');
      name.className = 'chat-paste-name';
      name.textContent = file.name || 'attachment';
      chip.appendChild(name);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'chat-paste-remove';
      remove.setAttribute('aria-label', 'Remove attachment');
      remove.innerHTML = '&times;';
      remove.addEventListener('click', function(){ removePendingFile(index); });
      chip.appendChild(remove);

      preview.appendChild(chip);
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

  function renameClipboardFile(file, index){
    if(file.name) return file;
    const extension = getExtensionByType(file.type);
    return new File([file], 'pasted-attachment-' + (Date.now() + index) + extension, {type:file.type || 'application/octet-stream'});
  }

  function getExtensionByType(type){
    if(!type) return '';
    if(type === 'image/png') return '.png';
    if(type === 'image/jpeg') return '.jpg';
    if(type === 'image/gif') return '.gif';
    if(type === 'image/webp') return '.webp';
    if(type === 'application/pdf') return '.pdf';
    return '';
  }

  function removeDuplicateFiles(files){
    const seen = new Set();
    return files.filter(function(file){
      const key = [file.name, file.size, file.type, file.lastModified].join('|');
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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
