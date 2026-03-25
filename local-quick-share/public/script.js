document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const localUrlEl = document.getElementById('local-url');
    const qrContainer = document.getElementById('qr-container');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectBtn = document.getElementById('select-btn');
    const filesList = document.getElementById('files-list');
    const refreshBtn = document.getElementById('refresh-btn');
    const toast = document.getElementById('toast');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressFilename = document.getElementById('progress-filename');

    const qrModal = document.getElementById('qr-modal');
    const modalFilename = document.getElementById('modal-filename');
    const modalQrContainer = document.getElementById('modal-qr-container');
    const closeBtn = document.querySelector('.close-btn');

    const filePassInput = document.getElementById('file-password');

    // State
    let files = [];
    let serverShareUrl = '';

    // Fetch Initial Server Info
    const fetchInfo = async () => {
        try {
            const response = await fetch('/api/info');
            const data = await response.json();
            serverShareUrl = data.url;
            localUrlEl.textContent = data.url;
            qrContainer.innerHTML = `<img src="${data.qrCode}" alt="Share QR Code">`;
        } catch (err) {
            console.error('Failed to fetch server info:', err);
            localUrlEl.textContent = 'Server Unreachable';
        }
    };

    // Fetch Files List
    const fetchFiles = async () => {
        try {
            const response = await fetch('/api/files');
            files = await response.json();
            renderFiles();
        } catch (err) {
            console.error('Failed to fetch files:', err);
        }
    };

    // Render Files UI
    const renderFiles = () => {
        if (files.length === 0) {
            filesList.innerHTML = `
                <div class="empty-state">
                    <p>No files shared yet.</p>
                </div>
            `;
            return;
        }

        filesList.innerHTML = '';
        files.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate))
            .forEach(file => {
                const item = document.createElement('div');
                item.className = 'file-item';
                const fileDownloadUrl = file.url;
                const isLocked = file.isProtected;
                
                item.innerHTML = `
                    <div class="file-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
                    </div>
                    <div class="file-details">
                        <div class="file-name" title="${file.originalName}">
                            ${file.originalName}
                            ${isLocked ? '<span class="locked-badge"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> LOCKED</span>' : ''}
                        </div>
                        <div class="file-size">${formatBytes(file.size)} • ${new Date(file.uploadDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div class="file-actions">
                        <button class="action-btn btn-qr-prominent" data-filename="${file.originalName}" data-url="${fileDownloadUrl}">
                             Get QR code
                        </button>
                        <a href="${fileDownloadUrl}" target="_blank" class="action-btn">Download</a>
                        <button class="action-btn btn-delete" data-filename="${file.name}">Delete</button>
                    </div>
                `;
                filesList.appendChild(item);
            });

        // Add Listeners
        document.querySelectorAll('.btn-qr-prominent').forEach(btn => {
            btn.onclick = (e) => showFileQR(e.currentTarget.dataset.filename, e.currentTarget.dataset.url);
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.onclick = (e) => deleteFile(e.target.dataset.filename);
        });
    };

    // Show QR Modal
    const showFileQR = async (filename, fileUrl) => {
        modalFilename.textContent = filename;
        try {
            const qrDataUrl = await QRCode.toDataURL(fileUrl, {
                width: 300,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
            modalQrContainer.innerHTML = `<img src="${qrDataUrl}" alt="File QR Code">`;
        } catch (err) {
            console.error('QR generation failed:', err);
            modalQrContainer.innerHTML = `<p>Failed to generate QR</p>`;
        }
        qrModal.style.display = 'flex';
    };

    // Close Modal
    closeBtn.onclick = () => qrModal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === qrModal) qrModal.style.display = 'none';
    };

    // Upload File Logic
    const uploadFile = (file) => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        
        const password = filePassInput.value;
        if (password) {
            formData.append('password', password);
        }

        progressContainer.style.display = 'block';
        progressFilename.textContent = `Sharing: ${file.name}`;
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload', true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressFill.style.width = percent + '%';
                progressPercent.textContent = percent + '%';
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                showToast('File shared successfully!');
                filePassInput.value = ''; // Clear password
                fetchFiles();
                
                // Automatically show QR using the valid server download URL
                const absoluteFileUrl = `${serverShareUrl}/download/${encodeURIComponent(response.file)}`;
                setTimeout(() => {
                    showFileQR(file.name, absoluteFileUrl);
                    progressContainer.style.display = 'none';
                    progressFill.style.width = '0%';
                }, 800);
            } else {
                showToast('Upload failed!', true);
            }
        };

        xhr.onerror = () => {
            showToast('Network error during upload!', true);
        };

        xhr.send(formData);
    };

    // Delete File Logic
    const deleteFile = async (filename) => {
        if (!confirm(`Are you sure you want to delete this file?`)) return;
        
        try {
            const response = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                showToast('File deleted');
                fetchFiles();
            }
        } catch (err) {
            showToast('Failed to delete file', true);
        }
    };

    // Drag and Drop Handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        dropZone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    dropZone.addEventListener('dragover', () => dropZone.classList.add('drag-over'));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) uploadFile(files[0]);
    });

    // Event Listeners
    selectBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        if (e.target.files.length > 0) {
            uploadFile(e.target.files[0]);
        }
    };
    refreshBtn.onclick = fetchFiles;

    // Helpers
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function showToast(message, isError = false) {
        toast.textContent = message;
        toast.style.background = isError ? 'var(--danger)' : 'var(--card-bg)';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Initialize
    fetchInfo();
    fetchFiles();
});
