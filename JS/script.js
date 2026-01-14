// Data mata pelajaran
const subjects = [
    'PBO', 'PAI', 'P8', 'Bahasa Jepang', 'Bahasa Inggris', 
    'PJOK', 'Matematika', 'PKK', 'PWPB', 'Robotik', 
    'PPKN', 'Sejarah', 'Bahasa Indonesia', 'PPL', 'Basis Data'
];

// State
let tasks = [];
let currentSubject = null;
let uploadedFiles = [];
let fileOrderMap = {};
let orderCounter = 0;
let editUploadedFiles = [];
let editFileOrderMap = {};
let editOrderCounter = 0;
let lightboxImages = [];
let currentLightboxIndex = 0;
let zoomLevel = 1;
let isDragging = false;
let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let initialPinchDistance = 0;
let lastPinchDistance = 0;
let isPinching = false;

// File size limit (1GB)
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB in bytes

// Fungsi untuk mengecek ukuran localStorage
function getLocalStorageSize() {
    let total = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length + key.length;
        }
    }
    return total;
}

// Fungsi untuk format ukuran storage
function formatStorageSize(bytes) {
    return formatFileSize(bytes);
}

// Fungsi untuk mengecek apakah ada ruang cukup di localStorage
function hasEnoughStorage(additionalSize) {
    const currentSize = getLocalStorageSize();
    const maxSize = getLocalStorageLimit();
    const remainingSize = maxSize - currentSize;
    const estimatedSize = additionalSize * 1.4; // 1.4x for JSON overhead + safety margin
    
    console.log('📊 Storage Analysis:');
    console.log('  Current used:', formatStorageSize(currentSize));
    console.log('  Total limit:', formatStorageSize(maxSize));
    console.log('  Remaining:', formatStorageSize(remainingSize));
    console.log('  Will use (estimated):', formatStorageSize(estimatedSize));
    console.log('  After upload:', formatStorageSize(currentSize + estimatedSize));
    console.log('  Can store:', estimatedSize < remainingSize ? '✅ YES' : '❌ NO');
    
    // Sisakan 10% sebagai buffer untuk keamanan
    const safeLimit = maxSize * 0.9;
    
    return (currentSize + estimatedSize) < safeLimit;
}

// Fungsi untuk menghitung ukuran base64
function getBase64Size(base64String) {
    const base64Data = base64String.split(',')[1] || base64String;
    const padding = (base64Data.match(/=/g) || []).length;
    return (base64Data.length * 0.75) - padding;
}

// Fungsi untuk mendeteksi limit localStorage secara dinamis
function detectLocalStorageLimit() {
    if (!localStorage) {
        return 0;
    }
    
    const testKey = '_test_limit_';
    const oneCharSize = 2; // 1 karakter = 2 bytes dalam UTF-16
    let low = 0;
    let high = 10 * 1024 * 1024; // Start dengan 10MB
    let limit = 0;
    
    // Binary search untuk menemukan limit
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        try {
            const testValue = new Array(mid + 1).join('a');
            localStorage.setItem(testKey, testValue);
            localStorage.removeItem(testKey);
            low = mid + 1;
            limit = mid;
        } catch (e) {
            high = mid - 1;
        }
    }
    
    return limit * oneCharSize;
}

// Cache limit localStorage
let cachedStorageLimit = null;

function getLocalStorageLimit() {
    if (cachedStorageLimit === null) {
        cachedStorageLimit = detectLocalStorageLimit();
        console.log('📦 localStorage Limit Detected:', formatStorageSize(cachedStorageLimit));
    }
    return cachedStorageLimit;
}

// Fungsi untuk mendapatkan ruang tersisa
function getRemainingStorage() {
    const used = getLocalStorageSize();
    const limit = getLocalStorageLimit();
    return limit - used;
}

// DOM Elements
const hamburger = document.getElementById('hamburger');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const closeSidebar = document.getElementById('closeSidebar');
const tabLinks = document.querySelectorAll('.tab-link');
const tabContents = document.querySelectorAll('.tab-content');
const subjectsList = document.getElementById('subjectsList');
const tasksContainer = document.getElementById('tasksContainer');
const selectedSubjectTitle = document.getElementById('selectedSubject');
const mobileSubjectSelect = document.getElementById('mobileSubjectSelect');
const addTaskForm = document.getElementById('addTaskForm');
const taskFiles = document.getElementById('taskFiles');
const filesPreview = document.getElementById('filesPreview');
const uploadArea = document.getElementById('uploadArea');
const orderingInfo = document.getElementById('orderingInfo');
const previewOrderBtn = document.getElementById('previewOrderBtn');
const resetOrderBtn = document.getElementById('resetOrderBtn');
const taskModal = document.getElementById('taskModal');
const closeModal = document.getElementById('closeModal');
const previewOrderModal = document.getElementById('previewOrderModal');
const closePreviewModal = document.getElementById('closePreviewModal');
const editTaskModal = document.getElementById('editTaskModal');
const closeEditModal = document.getElementById('closeEditModal');
const editTaskForm = document.getElementById('editTaskForm');
const editTaskFiles = document.getElementById('editTaskFiles');
const editFilesPreview = document.getElementById('editFilesPreview');
const editUploadArea = document.getElementById('editUploadArea');
const editOrderingInfo = document.getElementById('editOrderingInfo');
const editPreviewOrderBtn = document.getElementById('editPreviewOrderBtn');
const editResetOrderBtn = document.getElementById('editResetOrderBtn');
const cancelEditBtn = document.getElementById('cancelEdit');
const lightbox = document.getElementById('lightbox');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxCounter = document.getElementById('lightboxCounter');
const lightboxContent = document.getElementById('lightboxContent');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const zoomResetBtn = document.getElementById('zoomReset');

// Helper function to check if file is image
function isImageFile(filename) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'heic', 'jfif', 'ico', 'raw', 'avif', 'eps', 'indd'];
    const ext = filename.split('.').pop().toLowerCase();
    return imageExtensions.includes(ext);
}

// Helper function to get file icon based on extension
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': 'bi-file-pdf',
        'doc': 'bi-file-word',
        'docx': 'bi-file-word',
        'xls': 'bi-file-excel',
        'xlsx': 'bi-file-excel',
        'ppt': 'bi-file-ppt',
        'pptx': 'bi-file-ppt',
        'zip': 'bi-file-zip',
        'rar': 'bi-file-zip',
        'txt': 'bi-file-text',
        'mp4': 'bi-file-play',
        'mp3': 'bi-file-music',
        'avi': 'bi-file-play',
        'mov': 'bi-file-play'
    };
    return iconMap[ext] || 'bi-file-earmark';
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    renderSubjects();
    setupEventListeners();
    setupDragAndDrop();
    updateMobileSubjectCount();
    
    // Log storage info
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 BROWSER STORAGE INFORMATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const limit = getLocalStorageLimit();
    const used = getLocalStorageSize();
    const remaining = limit - used;
    const percentage = (used / limit * 100).toFixed(2);
    
    console.log('Browser:', navigator.userAgent.split(' ').pop());
    console.log('Limit:', formatStorageSize(limit));
    console.log('Used:', formatStorageSize(used), `(${percentage}%)`);
    console.log('Remaining:', formatStorageSize(remaining));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Load tasks from localStorage
function loadTasks() {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    }
}

// Save tasks to localStorage
function saveTasks() {
    try {
        const tasksJSON = JSON.stringify(tasks);
        const tasksSize = new Blob([tasksJSON]).size;
        const storageLimit = getLocalStorageLimit();
        const safeLimit = storageLimit * 0.9; // 90% dari limit
        
        // Cek ukuran sebelum menyimpan
        if (tasksSize > safeLimit) {
            throw new Error('Data terlalu besar untuk disimpan');
        }
        
        localStorage.setItem('tasks', tasksJSON);
        console.log('✓ Data berhasil disimpan. Ukuran:', formatStorageSize(tasksSize));
        console.log('  Storage usage:', ((tasksSize / storageLimit) * 100).toFixed(2) + '%');
        return true;
    } catch (error) {
        console.error('Error menyimpan data:', error);
        
        const storageLimit = getLocalStorageLimit();
        const currentSize = getLocalStorageSize();
        
        if (error.name === 'QuotaExceededError' || error.message.includes('quota') || error.message.includes('terlalu besar')) {
            Swal.fire({
                title: 'Penyimpanan Penuh!',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Browser storage sudah penuh!</strong></p>
                        
                        <div style="background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                            <p style="margin: 0.5rem 0;"><strong>📦 Storage Info:</strong></p>
                            <p style="margin: 0.5rem 0;">• Limit: <strong>${formatStorageSize(storageLimit)}</strong></p>
                            <p style="margin: 0.5rem 0;">• Terpakai: <strong>${formatStorageSize(currentSize)}</strong> (${((currentSize / storageLimit) * 100).toFixed(1)}%)</p>
                            <p style="margin: 0.5rem 0;">• Tersisa: <strong>${formatStorageSize(storageLimit - currentSize)}</strong></p>
                        </div>
                        
                        <p><strong>💡 Solusi:</strong></p>
                        <ul style="margin: 0.5rem 0;">
                            <li>Hapus tugas lama yang sudah selesai</li>
                            <li>Kurangi jumlah file yang diupload</li>
                            <li>Compress/resize gambar sebelum upload</li>
                            <li>Gunakan file dengan ukuran lebih kecil</li>
                        </ul>
                    </div>
                `,
                icon: 'error',
                confirmButtonText: 'Mengerti',
                footer: '<a href="#" id="clearStorageLink" style="color: #ef4444; font-weight: bold;">⚠️ Reset Semua Data</a>'
            });
            
            // Handle clear storage
            setTimeout(() => {
                const clearLink = document.getElementById('clearStorageLink');
                if (clearLink) {
                    clearLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        confirmClearStorage();
                    });
                }
            }, 100);
            
            return false;
        } else {
            Swal.fire({
                title: 'Error Menyimpan!',
                text: 'Gagal menyimpan data: ' + error.message,
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return false;
        }
    }
}

// Fungsi untuk konfirmasi clear storage
function confirmClearStorage() {
    Swal.fire({
        title: 'Reset Semua Data?',
        html: '<p>Ini akan menghapus <strong>SEMUA</strong> tugas yang tersimpan.</p><p>Tindakan ini <strong>TIDAK DAPAT</strong> dibatalkan!</p>',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Reset Semua',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#ef4444',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            tasks = [];
            Swal.fire({
                title: 'Berhasil!',
                text: 'Semua data telah dihapus. Halaman akan direload.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                window.location.reload();
            });
        }
    });
}

// Render subjects list
function renderSubjects() {
    subjectsList.innerHTML = '';
    
    subjects.forEach(subject => {
        const count = tasks.filter(task => task.subject === subject && !task.completed).length;
        
        const li = document.createElement('li');
        li.className = 'subject-item';
        if (currentSubject === subject) {
            li.classList.add('active');
        }
        
        li.innerHTML = `
            <span class="subject-name">${subject}</span>
            ${count > 0 ? `<span class="task-count">${count}</span>` : ''}
        `;
        
        li.addEventListener('click', () => {
            currentSubject = subject;
            renderSubjects();
            renderTasks(subject);
            updateMobileSubjectSelect(subject);
        });
        
        subjectsList.appendChild(li);
    });
}

// Update mobile subject select
function updateMobileSubjectSelect(subject) {
    if (mobileSubjectSelect) {
        mobileSubjectSelect.value = subject || '';
    }
}

// Update mobile subject count in options
function updateMobileSubjectCount() {
    subjects.forEach((subject, index) => {
        const count = tasks.filter(task => task.subject === subject && !task.completed).length;
        const option = mobileSubjectSelect.options[index + 1];
        if (option) {
            option.textContent = count > 0 ? `${subject} (${count})` : subject;
        }
    });
}

// Render tasks for selected subject
function renderTasks(subject) {
    selectedSubjectTitle.textContent = subject;
    const subjectTasks = tasks.filter(task => task.subject === subject);
    
    if (subjectTasks.length === 0) {
        tasksContainer.innerHTML = '<div class="empty-state"><p>Belum ada tugas untuk mata pelajaran ini</p></div>';
        return;
    }
    
    tasksContainer.innerHTML = '';
    
    subjectTasks.forEach((task, index) => {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';
        if (task.completed) {
            taskCard.classList.add('completed');
        }
        
        taskCard.innerHTML = `
            <h3>Tugas ${index + 1}</h3>
            <p>${task.description}</p>
            <div class="task-actions">
                <div class="task-actions-left">
                    <div class="task-checkbox">
                        <input type="checkbox" id="task-${task.id}" ${task.completed ? 'checked' : ''}>
                        <label for="task-${task.id}">Selesai</label>
                    </div>
                </div>
                <div class="task-actions-right">
                    <button class="btn-edit" data-id="${task.id}"><i class="bi bi-pencil-square"></i> Edit</button>
                    <button class="btn-delete ${task.completed ? 'enabled' : ''}" data-id="${task.id}">
                        <i class="bi bi-trash3"></i> Hapus
                    </button>
                    <button class="btn-view" data-id="${task.id}">Lihat Tugas</button>
                </div>
            </div>
        `;
        
        const checkbox = taskCard.querySelector('input[type="checkbox"]');
        const deleteBtn = taskCard.querySelector('.btn-delete');
        const editBtn = taskCard.querySelector('.btn-edit');
        
        checkbox.addEventListener('change', () => {
            toggleTaskComplete(task.id);
            if (checkbox.checked) {
                deleteBtn.classList.add('enabled');
            } else {
                deleteBtn.classList.remove('enabled');
            }
        });
        
        editBtn.addEventListener('click', () => {
            openEditModal(task.id);
        });
        
        deleteBtn.addEventListener('click', () => {
            if (task.completed) {
                confirmDeleteTask(task.id);
            }
        });
        
        const viewBtn = taskCard.querySelector('.btn-view');
        viewBtn.addEventListener('click', () => {
            showTaskDetail(task.id);
        });
        
        tasksContainer.appendChild(taskCard);
    });
}

// Toggle task complete status
function toggleTaskComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderSubjects();
        updateMobileSubjectCount();
        if (currentSubject) {
            renderTasks(currentSubject);
        }
    }
}

// Confirm delete task
function confirmDeleteTask(taskId) {
    Swal.fire({
        title: 'Hapus Tugas?',
        text: 'Apakah Anda yakin ingin menghapus tugas ini? Tindakan ini tidak dapat dibatalkan.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            deleteTask(taskId);
        }
    });
}

// Delete task
function deleteTask(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasks();
    renderSubjects();
    updateMobileSubjectCount();
    if (currentSubject) {
        renderTasks(currentSubject);
    }
    
    Swal.fire({
        title: 'Terhapus!',
        text: 'Tugas berhasil dihapus.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    });
}

// Show task detail in modal
function showTaskDetail(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = task.title;
    
    let modalContent = `
        <div class="modal-section">
            <h3><i class="bi bi-file-text"></i> Deskripsi</h3>
            <p>${task.description}</p>
        </div>
    `;
    
    if (task.content) {
        modalContent += `
            <div class="modal-section">
                <h3><i class="bi bi-card-list"></i> Isi Soal</h3>
                <p>${task.content}</p>
            </div>
        `;
    }
    
    if (task.files && task.files.length > 0) {
        // Separate images and non-images
        const images = task.files.filter(f => isImageFile(f.name));
        const otherFiles = task.files.filter(f => !isImageFile(f.name));
        
        // Display images
        if (images.length > 0) {
            modalContent += `
                <div class="modal-section">
                    <h3><i class="bi bi-images"></i> Gambar (${images.length})</h3>
                    <div class="modal-images-grid">
            `;
            
            images.forEach((img, index) => {
                modalContent += `
                    <div class="modal-image-item" data-index="${index}">
                        <img src="${img.data}" alt="${img.name}">
                        <div class="modal-image-number">${index + 1}</div>
                    </div>
                `;
            });
            
            modalContent += `
                    </div>
                </div>
            `;
        }
        
        // Display other files
        if (otherFiles.length > 0) {
            modalContent += `
                <div class="modal-section">
                    <h3><i class="bi bi-files"></i> File Lainnya (${otherFiles.length})</h3>
                    <div class="modal-files-list">
            `;
            
            otherFiles.forEach((file, index) => {
                const isPDF = file.name.toLowerCase().endsWith('.pdf');
                modalContent += `
                    <div class="modal-file-item">
                        <div class="modal-file-info">
                            <i class="bi ${getFileIcon(file.name)} modal-file-icon"></i>
                            <div class="modal-file-details">
                                <span class="modal-file-name">${file.name}</span>
                                <span class="modal-file-size">${file.size}</span>
                            </div>
                        </div>
                        <div class="modal-file-actions">
                            ${isPDF ? `<button class="btn-file-action btn-view-pdf" data-file-data="${file.data}" data-file-name="${file.name}">
                                <i class="bi bi-eye"></i> Lihat
                            </button>` : ''}
                            <button class="btn-file-action btn-download" data-file-data="${file.data}" data-file-name="${file.name}">
                                <i class="bi bi-download"></i> Download
                            </button>
                        </div>
                    </div>
                `;
            });
            
            modalContent += `
                    </div>
                </div>
            `;
        }
    }
    
    modalBody.innerHTML = modalContent;
    
    // Setup lightbox for images
    if (task.files && task.files.length > 0) {
        const images = task.files.filter(f => isImageFile(f.name));
        if (images.length > 0) {
            lightboxImages = images.map(img => img.data);
            const imageItems = modalBody.querySelectorAll('.modal-image-item');
            imageItems.forEach((item, index) => {
                item.addEventListener('click', () => {
                    openLightbox(index);
                });
            });
        }
    }
    
    // Setup download and view PDF buttons
    const downloadBtns = modalBody.querySelectorAll('.btn-download');
    downloadBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const fileData = btn.dataset.fileData;
            const fileName = btn.dataset.fileName;
            downloadFile(fileData, fileName);
        });
    });
    
    const viewPDFBtns = modalBody.querySelectorAll('.btn-view-pdf');
    viewPDFBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const fileData = btn.dataset.fileData;
            const fileName = btn.dataset.fileName;
            openPDFInNewTab(fileData, fileName);
        });
    });
    
    taskModal.classList.add('active');
}

// Download file function
function downloadFile(fileData, fileName) {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Open PDF in new tab
function openPDFInNewTab(fileData, fileName) {
    try {
        // Konversi base64 ke Blob
        const base64Data = fileData.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Buat URL dari Blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Buka di tab baru
        const newWindow = window.open(blobUrl, '_blank');
        
        if (!newWindow) {
            // Jika popup diblokir, fallback ke download
            Swal.fire({
                title: 'Popup Diblokir',
                text: 'Browser memblokir popup. File akan didownload sebagai gantinya.',
                icon: 'info',
                confirmButtonText: 'OK'
            }).then(() => {
                downloadFile(fileData, fileName);
            });
        }
        
        // Cleanup URL setelah beberapa detik
        setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
        }, 100);
        
    } catch (error) {
        console.error('Error membuka PDF:', error);
        Swal.fire({
            title: 'Error',
            text: 'Gagal membuka PDF. Silakan coba download file.',
            icon: 'error',
            confirmButtonText: 'OK'
        });
    }
}

// Lightbox functions with zoom
function openLightbox(index) {
    currentLightboxIndex = index;
    zoomLevel = 1;
    translateX = 0;
    translateY = 0;
    updateLightbox();
    lightbox.classList.add('active');
    
    const isMobile = window.innerWidth <= 768 || 
                     (window.innerHeight <= 768 && window.matchMedia("(orientation: landscape)").matches);
    
    if (isMobile && lightboxImages.length > 1) {
        showSwipeHint();
    }
}

function showSwipeHint() {
    const hint = document.createElement('div');
    hint.className = 'lightbox-swipe-hint';
    hint.innerHTML = '<i class="bi bi-arrow-left-right"></i> Swipe untuk navigasi';
    lightbox.appendChild(hint);
    
    setTimeout(() => {
        if (hint.parentNode) {
            hint.remove();
        }
    }, 3000);
    
    const pinchHint = document.createElement('div');
    pinchHint.className = 'lightbox-pinch-hint';
    pinchHint.innerHTML = '<i class="bi bi-arrows-angle-contract"></i> Pinch untuk Zoom<br><i class="bi bi-hand-index"></i> Drag saat Zoom';
    lightbox.appendChild(pinchHint);
    
    setTimeout(() => {
        if (pinchHint.parentNode) {
            pinchHint.remove();
        }
    }, 4000);
}

function closeLightboxFunc() {
    lightbox.classList.remove('active');
    zoomLevel = 1;
    translateX = 0;
    translateY = 0;
}

function updateLightbox() {
    lightboxImage.src = lightboxImages[currentLightboxIndex];
    lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${lightboxImages.length}`;
    lightboxImage.style.transform = `scale(${zoomLevel}) translate(${translateX}px, ${translateY}px)`;
}

function nextImage() {
    currentLightboxIndex = (currentLightboxIndex + 1) % lightboxImages.length;
    zoomLevel = 1;
    translateX = 0;
    translateY = 0;
    updateLightbox();
}

function prevImage() {
    currentLightboxIndex = (currentLightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    zoomLevel = 1;
    translateX = 0;
    translateY = 0;
    updateLightbox();
}

function zoomIn() {
    zoomLevel = Math.min(zoomLevel + 0.5, 5);
    updateLightbox();
}

function zoomOut() {
    zoomLevel = Math.max(zoomLevel - 0.5, 0.5);
    if (zoomLevel <= 1) {
        translateX = 0;
        translateY = 0;
    }
    updateLightbox();
}

function resetZoom() {
    zoomLevel = 1;
    translateX = 0;
    translateY = 0;
    updateLightbox();
}

// Mouse drag for panning
lightboxContent.addEventListener('mousedown', (e) => {
    if (zoomLevel > 1 && e.target === lightboxImage) {
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        lightboxContent.classList.add('grabbing');
        e.preventDefault();
    }
});

lightboxContent.addEventListener('mousemove', (e) => {
    if (isDragging && zoomLevel > 1) {
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateLightbox();
    }
});

lightboxContent.addEventListener('mouseup', () => {
    isDragging = false;
    lightboxContent.classList.remove('grabbing');
});

lightboxContent.addEventListener('mouseleave', () => {
    isDragging = false;
    lightboxContent.classList.remove('grabbing');
});

// Mouse wheel zoom
lightboxContent.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
        zoomIn();
    } else {
        zoomOut();
    }
}, { passive: false });

// Touch events for swipe navigation
lightboxContent.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        isPinching = true;
        initialPinchDistance = getPinchDistance(e.touches);
        lastPinchDistance = initialPinchDistance;
    } else if (e.touches.length === 1) {
        isPinching = false;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        
        if (zoomLevel > 1) {
            isDragging = true;
            startX = touchStartX - translateX;
            startY = touchStartY - translateY;
            lightboxContent.classList.add('grabbing');
        }
    }
}, false);

lightboxContent.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && isPinching) {
        e.preventDefault();
        const currentDistance = getPinchDistance(e.touches);
        const delta = currentDistance - lastPinchDistance;
        
        const zoomChange = delta * 0.01;
        zoomLevel = Math.max(0.5, Math.min(5, zoomLevel + zoomChange));
        
        if (zoomLevel <= 1) {
            translateX = 0;
            translateY = 0;
        }
        
        updateLightbox();
        lastPinchDistance = currentDistance;
    } else if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
        e.preventDefault();
        const touch = e.touches[0];
        translateX = touch.clientX - startX;
        translateY = touch.clientY - startY;
        updateLightbox();
    }
}, { passive: false });

lightboxContent.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
        isPinching = false;
    }
    
    if (e.touches.length === 0) {
        if (isDragging) {
            isDragging = false;
            lightboxContent.classList.remove('grabbing');
        } else if (!isPinching && zoomLevel <= 1) {
            touchEndX = e.changedTouches[0].clientX;
            touchEndY = e.changedTouches[0].clientY;
            handleSwipe();
        }
    }
}, false);

function getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function handleSwipe() {
    const swipeThreshold = 50;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
        if (deltaX > 0) {
            prevImage();
        } else {
            nextImage();
        }
    }
}

// Add new task
addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (uploadedFiles.length > 50) {
        Swal.fire({
            title: 'Terlalu Banyak File!',
            text: 'Maksimal 50 file per tugas.',
            icon: 'error'
        });
        return;
    }
    
    const orderedFiles = getOrderedFiles();
    
    const newTask = {
        id: Date.now().toString(),
        subject: document.getElementById('taskSubject').value,
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        content: document.getElementById('taskContent').value,
        files: orderedFiles,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
    
    // Coba simpan dengan error handling
    const saved = saveTasks();
    
    if (!saved) {
        // Rollback jika gagal
        tasks.pop();
        return;
    }
    
    addTaskForm.reset();
    uploadedFiles = [];
    fileOrderMap = {};
    orderCounter = 0;
    filesPreview.innerHTML = '';
    orderingInfo.style.display = 'none';
    
    switchTab('tugas');
    
    Swal.fire({
        title: 'Berhasil!',
        text: 'Tugas berhasil ditambahkan.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    });
    
    renderSubjects();
    updateMobileSubjectCount();
    if (currentSubject === newTask.subject) {
        renderTasks(currentSubject);
    }
});

// Get ordered files
function getOrderedFiles() {
    const ordered = [];
    const unordered = [];
    
    uploadedFiles.forEach((file, index) => {
        if (fileOrderMap[index] !== undefined) {
            ordered.push({ file, order: fileOrderMap[index] });
        } else {
            unordered.push(file);
        }
    });
    
    ordered.sort((a, b) => a.order - b.order);
    
    return [...ordered.map(item => item.file), ...unordered];
}

// File upload handling
uploadArea.addEventListener('click', () => {
    taskFiles.click();
});

taskFiles.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

function handleFiles(files) {
    if (uploadedFiles.length + files.length > 50) {
        Swal.fire({
            title: 'Terlalu Banyak File!',
            text: `Maksimal 50 file. Anda sudah memiliki ${uploadedFiles.length} file.`,
            icon: 'error'
        });
        return;
    }
    
    // Hitung total ukuran file yang akan diupload
    let totalSize = 0;
    Array.from(files).forEach(file => {
        totalSize += file.size;
    });
    
    // Estimasi ukuran setelah base64 encoding (tambah 33%)
    const estimatedBase64Size = totalSize * 1.33;
    
    // Cek apakah ada cukup ruang
    if (!hasEnoughStorage(estimatedBase64Size)) {
        const storageLimit = getLocalStorageLimit();
        const currentSize = getLocalStorageSize();
        const remainingSize = storageLimit - currentSize;
        
        Swal.fire({
            title: 'Storage Tidak Cukup!',
            html: `
                <div style="text-align: left;">
                    <p><strong>⚠️ Tidak cukup ruang untuk menyimpan file ini.</strong></p>
                    
                    <div style="background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <p style="margin: 0.5rem 0;"><strong>📁 File yang akan diupload:</strong></p>
                        <p style="margin: 0.5rem 0;">• Ukuran: <strong>${formatFileSize(totalSize)}</strong></p>
                        <p style="margin: 0.5rem 0;">• Setelah encoding: <strong>${formatFileSize(estimatedBase64Size)}</strong></p>
                    </div>
                    
                    <div style="background: rgba(37, 99, 235, 0.1); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <p style="margin: 0.5rem 0;"><strong>📦 Browser Storage:</strong></p>
                        <p style="margin: 0.5rem 0;">• Limit: <strong>${formatStorageSize(storageLimit)}</strong></p>
                        <p style="margin: 0.5rem 0;">• Terpakai: <strong>${formatStorageSize(currentSize)}</strong> (${((currentSize / storageLimit) * 100).toFixed(1)}%)</p>
                        <p style="margin: 0.5rem 0;">• Tersisa: <strong>${formatStorageSize(remainingSize)}</strong></p>
                        <p style="margin: 0.5rem 0;">• Dibutuhkan: <strong>${formatFileSize(estimatedBase64Size)}</strong></p>
                    </div>
                    
                    <p><strong>💡 Solusi:</strong></p>
                    <ul style="margin: 0.5rem 0;">
                        <li>Hapus beberapa tugas yang sudah selesai</li>
                        <li>Gunakan file dengan ukuran lebih kecil</li>
                        <li>Compress/resize file terlebih dahulu</li>
                        <li>Upload file satu per satu jika terlalu besar</li>
                    </ul>
                </div>
            `,
            icon: 'error',
            confirmButtonText: 'OK',
            width: '600px'
        });
        return;
    }

    function detectLocalStorageLimit() {
        if (!localStorage) {
            return 0;
        }
        
        const testKey = '_test_limit_';
        const oneCharSize = 2; // 1 karakter = 2 bytes dalam UTF-16
        let low = 0;
        let high = 10 * 1024 * 1024; // Start dengan 10MB
        let limit = 0;
        
        // Binary search untuk menemukan limit
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            try {
                const testValue = new Array(mid + 1).join('a');
                localStorage.setItem(testKey, testValue);
                localStorage.removeItem(testKey);
                low = mid + 1;
                limit = mid;
            } catch (e) {
                high = mid - 1;
            }
        }
        
        return limit * oneCharSize;
    }

    // Cache limit localStorage
    let cachedStorageLimit = null;

    function getLocalStorageLimit() {
        if (cachedStorageLimit === null) {
            cachedStorageLimit = detectLocalStorageLimit();
            console.log('📦 localStorage Limit Detected:', formatStorageSize(cachedStorageLimit));
        }
        return cachedStorageLimit;
    }

    // Fungsi untuk mendapatkan ruang tersisa
    function getRemainingStorage() {
        const used = getLocalStorageSize();
        const limit = getLocalStorageLimit();
        return limit - used;
    }
    
    let filesProcessed = 0;
    const totalFiles = files.length;
    const filesTooLarge = [];
    
    // Show loading indicator
    Swal.fire({
        title: 'Mengupload File...',
        html: `Memproses <strong>0</strong> dari <strong>${totalFiles}</strong> file`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    Array.from(files).forEach((file) => {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            filesTooLarge.push(file.name);
            filesProcessed++;
            
            // Update loading progress
            Swal.update({
                html: `Memproses <strong>${filesProcessed}</strong> dari <strong>${totalFiles}</strong> file`
            });
            
            if (filesProcessed === totalFiles) {
                Swal.close();
                if (filesTooLarge.length > 0) {
                    Swal.fire({
                        title: 'File Terlalu Besar!',
                        html: `File berikut melebihi 1GB:<br><br>${filesTooLarge.join('<br>')}`,
                        icon: 'error'
                    });
                }
                renderFilesPreview();
                if (uploadedFiles.length > 0) {
                    orderingInfo.style.display = 'flex';
                }
            }
            return;
        }
        
        const reader = new FileReader();
        
        reader.onerror = () => {
            console.error('Error reading file:', file.name);
            filesProcessed++;
            
            Swal.update({
                html: `Memproses <strong>${filesProcessed}</strong> dari <strong>${totalFiles}</strong> file`
            });
            
            if (filesProcessed === totalFiles) {
                Swal.close();
                Swal.fire({
                    title: 'Error!',
                    text: 'Gagal membaca beberapa file',
                    icon: 'error'
                });
            }
        };
        
        reader.onload = (e) => {
            const newIndex = uploadedFiles.length;
            uploadedFiles.push({
                name: file.name,
                data: e.target.result,
                size: formatFileSize(file.size),
                type: file.type
            });
            
            const nextOrder = Math.max(0, ...Object.values(fileOrderMap), 0) + 1;
            fileOrderMap[newIndex] = nextOrder;
            orderCounter = Math.max(orderCounter, nextOrder);
            
            filesProcessed++;
            
            // Update loading progress
            Swal.update({
                html: `Memproses <strong>${filesProcessed}</strong> dari <strong>${totalFiles}</strong> file`
            });
            
            if (filesProcessed === totalFiles) {
                Swal.close();
                
                if (filesTooLarge.length > 0) {
                    Swal.fire({
                        title: 'File Terlalu Besar!',
                        html: `File berikut melebihi 1GB:<br><br>${filesTooLarge.join('<br>')}`,
                        icon: 'error'
                    });
                }
                
                renderFilesPreview();
                
                if (uploadedFiles.length > 0) {
                    orderingInfo.style.display = 'flex';
                }
                
                // Show storage info if getting close to limit
                const storageUsed = getLocalStorageSize();
                const storageLimit = 5 * 1024 * 1024;
                const storagePercent = (storageUsed / storageLimit) * 100;
                
                if (storagePercent > 70) {
                    Swal.fire({
                        title: 'Peringatan Storage!',
                        html: `
                            <p>Storage hampir penuh: <strong>${storagePercent.toFixed(1)}%</strong></p>
                            <p>Ukuran: ${formatStorageSize(storageUsed)} / ${formatStorageSize(storageLimit)}</p>
                            <p>Pertimbangkan untuk menghapus tugas lama atau menggunakan file lebih kecil.</p>
                        `,
                        icon: 'warning',
                        confirmButtonText: 'Mengerti'
                    });
                }
            }
        };
        
        reader.readAsDataURL(file);
    });
}

function renderFilesPreview() {
    filesPreview.innerHTML = '';
    
    uploadedFiles.forEach((file, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.dataset.index = index;
        
        const isOrdered = fileOrderMap[index] !== undefined;
        if (isOrdered) {
            previewItem.classList.add('ordered');
        } else {
            previewItem.classList.add('unordered');
        }
        
        const displayNumber = isOrdered ? fileOrderMap[index] : '?';
        const numberClass = isOrdered ? 'ordered' : '';
        
        if (isImageFile(file.name)) {
            previewItem.innerHTML = `
                <div class="preview-image-container">
                    <img src="${file.data}" alt="${file.name}">
                    <div class="preview-number ${numberClass}">${displayNumber}</div>
                    <button class="preview-remove" data-index="${index}">&times;</button>
                </div>
                <select class="preview-order-select" data-index="${index}">
                    ${generateOrderOptions(index)}
                </select>
            `;
        } else {
            previewItem.classList.add('file-preview');
            previewItem.innerHTML = `
                <div class="preview-file-container">
                    <div class="preview-file-info">
                        <i class="bi ${getFileIcon(file.name)} preview-file-icon"></i>
                        <div class="preview-file-details">
                            <span class="preview-file-name">${file.name}</span>
                            <span class="preview-file-size">${file.size}</span>
                        </div>
                    </div>
                    <div class="preview-number ${numberClass}">${displayNumber}</div>
                    <button class="preview-remove" data-index="${index}">&times;</button>
                </div>
                <select class="preview-order-select" data-index="${index}">
                    ${generateOrderOptions(index)}
                </select>
            `;
        }
        
        const orderSelect = previewItem.querySelector('.preview-order-select');
        orderSelect.addEventListener('change', (e) => {
            const selectedOrder = parseInt(e.target.value);
            if (selectedOrder) {
                orderFileWithDropdown(index, selectedOrder);
            } else {
                if (fileOrderMap[index] !== undefined) {
                    const removedOrder = fileOrderMap[index];
                    delete fileOrderMap[index];
                    
                    Object.keys(fileOrderMap).forEach(key => {
                        if (fileOrderMap[key] > removedOrder) {
                            fileOrderMap[key]--;
                        }
                    });
                    orderCounter--;
                }
                renderFilesPreview();
            }
        });
        
        const removeBtn = previewItem.querySelector('.preview-remove');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile(index);
        });
        
        filesPreview.appendChild(previewItem);
    });
}

function generateOrderOptions(currentIndex) {
    let options = '<option value="">-- Pilih Urutan --</option>';
    for (let i = 1; i <= uploadedFiles.length; i++) {
        const isUsed = Object.values(fileOrderMap).includes(i) && fileOrderMap[currentIndex] !== i;
        const selected = fileOrderMap[currentIndex] === i ? 'selected' : '';
        const disabled = isUsed ? 'disabled' : '';
        options += `<option value="${i}" ${selected} ${disabled}>${i}</option>`;
    }
    return options;
}

function orderFileWithDropdown(index, newOrder) {
    const oldOrder = fileOrderMap[index];
    
    let fileWithThisOrder = null;
    for (let key in fileOrderMap) {
        if (fileOrderMap[key] === newOrder && parseInt(key) !== index) {
            fileWithThisOrder = parseInt(key);
            break;
        }
    }
    
    if (fileWithThisOrder !== null && oldOrder !== undefined) {
        fileOrderMap[fileWithThisOrder] = oldOrder;
        fileOrderMap[index] = newOrder;
    } else if (fileWithThisOrder !== null) {
        Object.keys(fileOrderMap).forEach(key => {
            if (fileOrderMap[key] >= newOrder && parseInt(key) !== index) {
                fileOrderMap[key]++;
            }
        });
        fileOrderMap[index] = newOrder;
        orderCounter = Math.max(orderCounter, newOrder);
    } else {
        if (oldOrder === undefined) {
            orderCounter++;
        }
        fileOrderMap[index] = newOrder;
    }
    
    renderFilesPreview();
}

function removeFile(index) {
    if (fileOrderMap[index] !== undefined) {
        const removedOrder = fileOrderMap[index];
        delete fileOrderMap[index];
        
        const newOrderMap = {};
        Object.keys(fileOrderMap).forEach(key => {
            const keyNum = parseInt(key);
            const order = fileOrderMap[key];
            
            if (order > removedOrder) {
                if (keyNum > index) {
                    newOrderMap[keyNum - 1] = order - 1;
                } else {
                    newOrderMap[keyNum] = order - 1;
                }
            } else {
                if (keyNum > index) {
                    newOrderMap[keyNum - 1] = order;
                } else {
                    newOrderMap[keyNum] = order;
                }
            }
        });
        fileOrderMap = newOrderMap;
        orderCounter--;
    } else {
        const newOrderMap = {};
        Object.keys(fileOrderMap).forEach(key => {
            const keyNum = parseInt(key);
            if (keyNum > index) {
                newOrderMap[keyNum - 1] = fileOrderMap[key];
            } else {
                newOrderMap[key] = fileOrderMap[key];
            }
        });
        fileOrderMap = newOrderMap;
    }
    
    uploadedFiles.splice(index, 1);
    
    if (uploadedFiles.length === 0) {
        orderingInfo.style.display = 'none';
    }
    
    renderFilesPreview();
}

// Preview order
previewOrderBtn.addEventListener('click', () => {
    const orderedFiles = getOrderedFiles();
    
    window.previewSourceFiles = uploadedFiles;
    window.previewSourceOrderMap = {...fileOrderMap};
    window.previewIsEdit = false;
    
    renderPreviewModal(orderedFiles);
});

// Reset order
resetOrderBtn.addEventListener('click', () => {
    fileOrderMap = {};
    orderCounter = 0;
    renderFilesPreview();
    
    Swal.fire({
        title: 'Reset Berhasil!',
        text: 'Urutan file telah direset.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
    });
});

// ============= EDIT TASK FUNCTIONS =============

function openEditModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskSubject').value = task.subject;
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskDescription').value = task.description;
    document.getElementById('editTaskContent').value = task.content || '';
    
    editUploadedFiles = task.files ? [...task.files] : [];
    editFileOrderMap = {};
    editOrderCounter = editUploadedFiles.length;
    
    editUploadedFiles.forEach((file, index) => {
        editFileOrderMap[index] = index + 1;
    });
    
    renderEditFilesPreview();
    
    if (editUploadedFiles.length > 0) {
        editOrderingInfo.style.display = 'flex';
    }
    
    editTaskModal.classList.add('active');
}

function closeEditModalFunc() {
    editTaskModal.classList.remove('active');
    editTaskForm.reset();
    editUploadedFiles = [];
    editFileOrderMap = {};
    editOrderCounter = 0;
    editFilesPreview.innerHTML = '';
    editOrderingInfo.style.display = 'none';
}

editTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (editUploadedFiles.length > 50) {
        Swal.fire({
            title: 'Terlalu Banyak File!',
            text: 'Maksimal 50 file per tugas.',
            icon: 'error'
        });
        return;
    }
    
    const taskId = document.getElementById('editTaskId').value;
    const task = tasks.find(t => t.id === taskId);
    
    if (!task) return;
    
    const orderedFiles = getEditOrderedFiles();
    
    task.subject = document.getElementById('editTaskSubject').value;
    task.title = document.getElementById('editTaskTitle').value;
    task.description = document.getElementById('editTaskDescription').value;
    task.content = document.getElementById('editTaskContent').value;
    task.files = orderedFiles;
    
    saveTasks();
    closeEditModalFunc();
    
    Swal.fire({
        title: 'Berhasil!',
        text: 'Tugas berhasil diperbarui.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    });
    
    renderSubjects();
    updateMobileSubjectCount();
    if (currentSubject) {
        renderTasks(currentSubject);
    }
});

cancelEditBtn.addEventListener('click', closeEditModalFunc);

function getEditOrderedFiles() {
    const ordered = [];
    const unordered = [];
    
    editUploadedFiles.forEach((file, index) => {
        if (editFileOrderMap[index] !== undefined) {
            ordered.push({ file, order: editFileOrderMap[index] });
        } else {
            unordered.push(file);
        }
    });
    
    ordered.sort((a, b) => a.order - b.order);
    return [...ordered.map(item => item.file), ...unordered];
}

editUploadArea.addEventListener('click', () => {
    editTaskFiles.click();
});

function handleEditFiles(files) {
    if (editUploadedFiles.length + files.length > 50) {
        Swal.fire({
            title: 'Terlalu Banyak File!',
            text: `Maksimal 50 file. Anda sudah memiliki ${editUploadedFiles.length} file.`,
            icon: 'error'
        });
        return;
    }
    
    // Hitung total ukuran file yang akan diupload
    let totalSize = 0;
    Array.from(files).forEach(file => {
        totalSize += file.size;
    });
    
    // Estimasi ukuran setelah base64 encoding
    const estimatedBase64Size = totalSize * 1.33;
    
    // Cek apakah ada cukup ruang
    if (!hasEnoughStorage(estimatedBase64Size)) {
        const storageLimit = getLocalStorageLimit();
        const currentSize = getLocalStorageSize();
        const remainingSize = storageLimit - currentSize;
        
        Swal.fire({
            title: 'Storage Tidak Cukup!',
            html: `
                <div style="text-align: left;">
                    <p><strong>⚠️ Tidak cukup ruang untuk menyimpan file ini.</strong></p>
                    
                    <div style="background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <p style="margin: 0.5rem 0;"><strong>📁 File yang akan diupload:</strong></p>
                        <p style="margin: 0.5rem 0;">• Ukuran: <strong>${formatFileSize(totalSize)}</strong></p>
                        <p style="margin: 0.5rem 0;">• Setelah encoding: <strong>${formatFileSize(estimatedBase64Size)}</strong></p>
                    </div>
                    
                    <div style="background: rgba(37, 99, 235, 0.1); padding: 1rem; border-radius: 8px; margin: 1rem 0;">
                        <p style="margin: 0.5rem 0;"><strong>📦 Browser Storage:</strong></p>
                        <p style="margin: 0.5rem 0;">• Limit: <strong>${formatStorageSize(storageLimit)}</strong></p>
                        <p style="margin: 0.5rem 0;">• Terpakai: <strong>${formatStorageSize(currentSize)}</strong> (${((currentSize / storageLimit) * 100).toFixed(1)}%)</p>
                        <p style="margin: 0.5rem 0;">• Tersisa: <strong>${formatStorageSize(remainingSize)}</strong></p>
                        <p style="margin: 0.5rem 0;">• Dibutuhkan: <strong>${formatFileSize(estimatedBase64Size)}</strong></p>
                    </div>
                    
                    <p><strong>💡 Solusi:</strong></p>
                    <ul style="margin: 0.5rem 0;">
                        <li>Hapus beberapa tugas yang sudah selesai</li>
                        <li>Gunakan file dengan ukuran lebih kecil</li>
                        <li>Compress/resize file terlebih dahulu</li>
                    </ul>
                </div>
            `,
            icon: 'error',
            confirmButtonText: 'OK',
            width: '600px'
        });
        return;
    }
    
    let filesProcessed = 0;
    const totalFiles = files.length;
    const filesTooLarge = [];
    
    // Show loading indicator
    Swal.fire({
        title: 'Mengupload File...',
        html: `Memproses <strong>0</strong> dari <strong>${totalFiles}</strong> file`,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    Array.from(files).forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
            filesTooLarge.push(file.name);
            filesProcessed++;
            
            Swal.update({
                html: `Memproses <strong>${filesProcessed}</strong> dari <strong>${totalFiles}</strong> file`
            });
            
            if (filesProcessed === totalFiles) {
                Swal.close();
                if (filesTooLarge.length > 0) {
                    Swal.fire({
                        title: 'File Terlalu Besar!',
                        html: `File berikut melebihi 1GB:<br><br>${filesTooLarge.join('<br>')}`,
                        icon: 'error'
                    });
                }
                renderEditFilesPreview();
                if (editUploadedFiles.length > 0) {
                    editOrderingInfo.style.display = 'flex';
                }
            }
            return;
        }
        
        const reader = new FileReader();
        
        reader.onerror = () => {
            console.error('Error reading file:', file.name);
            filesProcessed++;
            
            Swal.update({
                html: `Memproses <strong>${filesProcessed}</strong> dari <strong>${totalFiles}</strong> file`
            });
            
            if (filesProcessed === totalFiles) {
                Swal.close();
                Swal.fire({
                    title: 'Error!',
                    text: 'Gagal membaca beberapa file',
                    icon: 'error'
                });
            }
        };
        
        reader.onload = (e) => {
            const newIndex = editUploadedFiles.length;
            editUploadedFiles.push({
                name: file.name,
                data: e.target.result,
                size: formatFileSize(file.size),
                type: file.type
            });
            
            const nextOrder = Math.max(0, ...Object.values(editFileOrderMap), 0) + 1;
            editFileOrderMap[newIndex] = nextOrder;
            editOrderCounter = Math.max(editOrderCounter, nextOrder);
            
            filesProcessed++;
            
            Swal.update({
                html: `Memproses <strong>${filesProcessed}</strong> dari <strong>${totalFiles}</strong> file`
            });
            
            if (filesProcessed === totalFiles) {
                Swal.close();
                
                if (filesTooLarge.length > 0) {
                    Swal.fire({
                        title: 'File Terlalu Besar!',
                        html: `File berikut melebihi 1GB:<br><br>${filesTooLarge.join('<br>')}`,
                        icon: 'error'
                    });
                }
                
                renderEditFilesPreview();
                
                if (editUploadedFiles.length > 0) {
                    editOrderingInfo.style.display = 'flex';
                }
                
                const storageUsed = getLocalStorageSize();
                const storageLimit = 5 * 1024 * 1024;
                const storagePercent = (storageUsed / storageLimit) * 100;
                
                if (storagePercent > 70) {
                    Swal.fire({
                        title: 'Peringatan Storage!',
                        html: `
                            <p>Storage hampir penuh: <strong>${storagePercent.toFixed(1)}%</strong></p>
                            <p>Ukuran: ${formatStorageSize(storageUsed)} / ${formatStorageSize(storageLimit)}</p>
                        `,
                        icon: 'warning',
                        confirmButtonText: 'Mengerti'
                    });
                }
            }
        };
        
        reader.readAsDataURL(file);
    });
}

function handleEditFiles(files) {
    if (editUploadedFiles.length + files.length > 50) {
        Swal.fire({
            title: 'Terlalu Banyak File!',
            text: `Maksimal 50 file. Anda sudah memiliki ${editUploadedFiles.length} file.`,
            icon: 'error'
        });
        return;
    }
    
    let filesProcessed = 0;
    const totalFiles = files.length;
    const filesTooLarge = [];
    
    Array.from(files).forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
            filesTooLarge.push(file.name);
            filesProcessed++;
            if (filesProcessed === totalFiles) {
                if (filesTooLarge.length > 0) {
                    Swal.fire({
                        title: 'File Terlalu Besar!',
                        html: `File berikut melebihi 1GB:<br><br>${filesTooLarge.join('<br>')}`,
                        icon: 'error'
                    });
                }
                renderEditFilesPreview();
                if (editUploadedFiles.length > 0) {
                    editOrderingInfo.style.display = 'flex';
                }
            }
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const newIndex = editUploadedFiles.length;
            editUploadedFiles.push({
                name: file.name,
                data: e.target.result,
                size: formatFileSize(file.size),
                type: file.type
            });
            
            const nextOrder = Math.max(0, ...Object.values(editFileOrderMap), 0) + 1;
            editFileOrderMap[newIndex] = nextOrder;
            editOrderCounter = Math.max(editOrderCounter, nextOrder);
            
            filesProcessed++;
            if (filesProcessed === totalFiles) {
                if (filesTooLarge.length > 0) {
                    Swal.fire({
                        title: 'File Terlalu Besar!',
                        html: `File berikut melebihi 1GB:<br><br>${filesTooLarge.join('<br>')}`,
                        icon: 'error'
                    });
                }
                renderEditFilesPreview();
                if (editUploadedFiles.length > 0) {
                    editOrderingInfo.style.display = 'flex';
                }
            }
        };
        reader.readAsDataURL(file);
    });
}

function renderEditFilesPreview() {
    editFilesPreview.innerHTML = '';
    
    editUploadedFiles.forEach((file, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.dataset.index = index;
        
        const isOrdered = editFileOrderMap[index] !== undefined;
        if (isOrdered) {
            previewItem.classList.add('ordered');
        } else {
            previewItem.classList.add('unordered');
        }
        
        const displayNumber = isOrdered ? editFileOrderMap[index] : '?';
        const numberClass = isOrdered ? 'ordered' : '';
        
        if (isImageFile(file.name)) {
            previewItem.innerHTML = `
                <div class="preview-image-container">
                    <img src="${file.data}" alt="${file.name}">
                    <div class="preview-number ${numberClass}">${displayNumber}</div>
                    <button class="preview-remove" data-index="${index}">&times;</button>
                </div>
                <select class="preview-order-select" data-index="${index}">
                    ${generateEditOrderOptions(index)}
                </select>
            `;
        } else {
            previewItem.classList.add('file-preview');
            previewItem.innerHTML = `
                <div class="preview-file-container">
                    <div class="preview-file-info">
                        <i class="bi ${getFileIcon(file.name)} preview-file-icon"></i>
                        <div class="preview-file-details">
                            <span class="preview-file-name">${file.name}</span>
                            <span class="preview-file-size">${file.size}</span>
                        </div>
                    </div>
                    <div class="preview-number ${numberClass}">${displayNumber}</div>
                    <button class="preview-remove" data-index="${index}">&times;</button>
                </div>
                <select class="preview-order-select" data-index="${index}">
                    ${generateEditOrderOptions(index)}
                </select>
            `;
        }
        
        const orderSelect = previewItem.querySelector('.preview-order-select');
        orderSelect.addEventListener('change', (e) => {
            const selectedOrder = parseInt(e.target.value);
            if (selectedOrder) {
                editOrderFileWithDropdown(index, selectedOrder);
            } else {
                if (editFileOrderMap[index] !== undefined) {
                    const removedOrder = editFileOrderMap[index];
                    delete editFileOrderMap[index];
                    
                    Object.keys(editFileOrderMap).forEach(key => {
                        if (editFileOrderMap[key] > removedOrder) {
                            editFileOrderMap[key]--;
                        }
                    });
                    editOrderCounter--;
                }
                renderEditFilesPreview();
            }
        });
        
        const removeBtn = previewItem.querySelector('.preview-remove');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            editRemoveFile(index);
        });
        
        editFilesPreview.appendChild(previewItem);
    });
}

function generateEditOrderOptions(currentIndex) {
    let options = '<option value="">-- Pilih Urutan --</option>';
    for (let i = 1; i <= editUploadedFiles.length; i++) {
        const isUsed = Object.values(editFileOrderMap).includes(i) && editFileOrderMap[currentIndex] !== i;
        const selected = editFileOrderMap[currentIndex] === i ? 'selected' : '';
        const disabled = isUsed ? 'disabled' : '';
        options += `<option value="${i}" ${selected} ${disabled}>${i}</option>`;
    }
    return options;
}

function editOrderFileWithDropdown(index, newOrder) {
    const oldOrder = editFileOrderMap[index];
    
    let fileWithThisOrder = null;
    for (let key in editFileOrderMap) {
        if (editFileOrderMap[key] === newOrder && parseInt(key) !== index) {
            fileWithThisOrder = parseInt(key);
            break;
        }
    }
    
    if (fileWithThisOrder !== null && oldOrder !== undefined) {
        editFileOrderMap[fileWithThisOrder] = oldOrder;
        editFileOrderMap[index] = newOrder;
    } else if (fileWithThisOrder !== null) {
        Object.keys(editFileOrderMap).forEach(key => {
            if (editFileOrderMap[key] >= newOrder && parseInt(key) !== index) {
                editFileOrderMap[key]++;
            }
        });
        editFileOrderMap[index] = newOrder;
        editOrderCounter = Math.max(editOrderCounter, newOrder);
    } else {
        if (oldOrder === undefined) {
            editOrderCounter++;
        }
        editFileOrderMap[index] = newOrder;
    }
    
    renderEditFilesPreview();
}

function editRemoveFile(index) {
    if (editFileOrderMap[index] !== undefined) {
        const removedOrder = editFileOrderMap[index];
        delete editFileOrderMap[index];
        
        const newOrderMap = {};
        Object.keys(editFileOrderMap).forEach(key => {
            const keyNum = parseInt(key);
            const order = editFileOrderMap[key];
            
            if (order > removedOrder) {
                if (keyNum > index) {
                    newOrderMap[keyNum - 1] = order - 1;
                } else {
                    newOrderMap[keyNum] = order - 1;
                }
            } else {
                if (keyNum > index) {
                    newOrderMap[keyNum - 1] = order;
                } else {
                    newOrderMap[keyNum] = order;
                }
            }
        });
        editFileOrderMap = newOrderMap;
        editOrderCounter--;
    } else {
        const newOrderMap = {};
        Object.keys(editFileOrderMap).forEach(key => {
            const keyNum = parseInt(key);
            if (keyNum > index) {
                newOrderMap[keyNum - 1] = editFileOrderMap[key];
            } else {
                newOrderMap[key] = editFileOrderMap[key];
            }
        });
        editFileOrderMap = newOrderMap;
    }
    
    editUploadedFiles.splice(index, 1);
    
    if (editUploadedFiles.length === 0) {
        editOrderingInfo.style.display = 'none';
    }
    
    renderEditFilesPreview();
}

editPreviewOrderBtn.addEventListener('click', () => {
    const orderedFiles = getEditOrderedFiles();
    
    window.previewSourceFiles = editUploadedFiles;
    window.previewSourceOrderMap = {...editFileOrderMap};
    window.previewIsEdit = true;
    
    renderPreviewModal(orderedFiles);
});

function renderPreviewModal(orderedFiles) {
    const previewBody = document.getElementById('previewOrderBody');
    
    const sourceFiles = window.previewSourceFiles;
    const sourceOrderMap = window.previewSourceOrderMap;
    
    const positionToOriginalIndex = {};
    const orderedIndices = [];
    const unorderedIndices = [];
    
    sourceFiles.forEach((file, idx) => {
        if (sourceOrderMap[idx] !== undefined) {
            orderedIndices.push({idx, order: sourceOrderMap[idx]});
        } else {
            unorderedIndices.push(idx);
        }
    });
    
    orderedIndices.sort((a, b) => a.order - b.order);
    orderedIndices.forEach((item, pos) => {
        positionToOriginalIndex[pos] = item.idx;
    });
    unorderedIndices.forEach((idx, i) => {
        positionToOriginalIndex[orderedIndices.length + i] = idx;
    });
    
    const images = orderedFiles.filter(f => isImageFile(f.name));
    const otherFiles = orderedFiles.filter(f => !isImageFile(f.name));
    
    let content = '';
    
    if (images.length > 0) {
        content += '<h3>Gambar</h3><div class="modal-images-grid">';
        images.forEach((file, displayIndex) => {
            const originalIndex = positionToOriginalIndex[orderedFiles.indexOf(file)];
            const currentOrder = sourceOrderMap[originalIndex];
            
            content += `
                <div class="modal-image-item" data-display-index="${displayIndex}" data-original-index="${originalIndex}">
                    <div class="modal-image-container">
                        <img src="${file.data}" alt="${file.name}">
                        <div class="modal-image-number">${displayIndex + 1}</div>
                    </div>
                    <select class="modal-order-select" data-original-index="${originalIndex}">
                        ${generatePreviewOrderOptions(originalIndex, sourceOrderMap, sourceFiles)}
                    </select>
                </div>
            `;
        });
        content += '</div>';
    }
    
    if (otherFiles.length > 0) {
        content += '<h3>File Lainnya</h3><div class="modal-files-preview-list">';
        otherFiles.forEach((file, displayIndex) => {
            const originalIndex = positionToOriginalIndex[orderedFiles.indexOf(file)];
            
            content += `
                <div class="modal-file-preview-item" data-original-index="${originalIndex}">
                    <div class="preview-file-info">
                        <i class="bi ${getFileIcon(file.name)} preview-file-icon"></i>
                        <div class="preview-file-details">
                            <span class="preview-file-name">${file.name}</span>
                            <span class="preview-file-size">${file.size}</span>
                        </div>
                    </div>
                    <select class="modal-order-select" data-original-index="${originalIndex}">
                        ${generatePreviewOrderOptions(originalIndex, sourceOrderMap, sourceFiles)}
                    </select>
                </div>
            `;
        });
        content += '</div>';
    }
    
    previewBody.innerHTML = content;
    
    lightboxImages = images.map(img => img.data);
    const imageContainers = previewBody.querySelectorAll('.modal-image-container');
    imageContainers.forEach((container, index) => {
        container.addEventListener('click', () => {
            openLightbox(index);
        });
    });
    
    const orderSelects = previewBody.querySelectorAll('.modal-order-select');
    orderSelects.forEach(select => {
        select.addEventListener('change', (e) => {
            const originalIndex = parseInt(e.target.dataset.originalIndex);
            const selectedOrder = parseInt(e.target.value);
            
            if (selectedOrder) {
                updatePreviewOrder(originalIndex, selectedOrder);
            } else {
                if (sourceOrderMap[originalIndex] !== undefined) {
                    const removedOrder = sourceOrderMap[originalIndex];
                    delete sourceOrderMap[originalIndex];
                    
                    Object.keys(sourceOrderMap).forEach(key => {
                        if (sourceOrderMap[key] > removedOrder) {
                            sourceOrderMap[key]--;
                        }
                    });
                }
                
                const newOrderedFiles = getOrderedFilesFromMap(sourceFiles, sourceOrderMap);
                renderPreviewModal(newOrderedFiles);
            }
        });
    });
    
    previewOrderModal.classList.add('active');
}

function generatePreviewOrderOptions(currentIndex, orderMap, files) {
    let options = '<option value="">-- Pilih Urutan --</option>';
    for (let i = 1; i <= files.length; i++) {
        const isUsed = Object.values(orderMap).includes(i) && orderMap[currentIndex] !== i;
        const selected = orderMap[currentIndex] === i ? 'selected' : '';
        const disabled = isUsed ? 'disabled' : '';
        options += `<option value="${i}" ${selected} ${disabled}>${i}</option>`;
    }
    return options;
}

function updatePreviewOrder(originalIndex, newOrder) {
    const sourceOrderMap = window.previewSourceOrderMap;
    const sourceFiles = window.previewSourceFiles;
    const oldOrder = sourceOrderMap[originalIndex];
    
    let fileWithThisOrder = null;
    for (let key in sourceOrderMap) {
        if (sourceOrderMap[key] === newOrder && parseInt(key) !== originalIndex) {
            fileWithThisOrder = parseInt(key);
            break;
        }
    }
    
    if (fileWithThisOrder !== null && oldOrder !== undefined) {
        sourceOrderMap[fileWithThisOrder] = oldOrder;
        sourceOrderMap[originalIndex] = newOrder;
    } else {
        sourceOrderMap[originalIndex] = newOrder;
    }
    
    if (window.previewIsEdit) {
        editFileOrderMap = {...sourceOrderMap};
    } else {
        fileOrderMap = {...sourceOrderMap};
    }
    
    const newOrderedFiles = getOrderedFilesFromMap(sourceFiles, sourceOrderMap);
    renderPreviewModal(newOrderedFiles);
}

function getOrderedFilesFromMap(files, orderMap) {
    const ordered = [];
    const unordered = [];
    
    files.forEach((file, index) => {
        if (orderMap[index] !== undefined) {
            ordered.push({ file, order: orderMap[index] });
        } else {
            unordered.push(file);
        }
    });
    
    ordered.sort((a, b) => a.order - b.order);
    return [...ordered.map(item => item.file), ...unordered];
}

editResetOrderBtn.addEventListener('click', () => {
    editFileOrderMap = {};
    editOrderCounter = 0;
    renderEditFilesPreview();
    
    Swal.fire({
        title: 'Reset Berhasil!',
        text: 'Urutan file telah direset.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
    });
});

function setupEditDragAndDrop() {
    editUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        editUploadArea.classList.add('dragover');
    });
    
    editUploadArea.addEventListener('dragleave', () => {
        editUploadArea.classList.remove('dragover');
    });
    
    editUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        editUploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        handleEditFiles(files);
    });
}

setupEditDragAndDrop();

function setupDragAndDrop() {
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
}

function switchTab(tabName) {
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    tabLinks.forEach(link => {
        link.classList.remove('active');
    });

    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    if (window.innerWidth <= 992) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        hamburger.classList.remove('active');
    }
}

function setupEventListeners() {
    mobileSubjectSelect.addEventListener('change', (e) => {
        const subject = e.target.value;
        if (subject) {
            currentSubject = subject;
            renderSubjects();
            renderTasks(subject);
        }
    });
    
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = link.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
    
    closeSidebar.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        hamburger.classList.remove('active');
    });
    
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        hamburger.classList.remove('active');
    });
    
    closeModal.addEventListener('click', () => {
        taskModal.classList.remove('active');
    });
    
    closePreviewModal.addEventListener('click', () => {
        previewOrderModal.classList.remove('active');
    });
    
    closeEditModal.addEventListener('click', closeEditModalFunc);
    
    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) {
            taskModal.classList.remove('active');
        }
    });
    
    previewOrderModal.addEventListener('click', (e) => {
        if (e.target === previewOrderModal) {
            previewOrderModal.classList.remove('active');
        }
    });
    
    editTaskModal.addEventListener('click', (e) => {
        if (e.target === editTaskModal) {
            closeEditModalFunc();
        }
    });
    
    lightboxClose.addEventListener('click', closeLightboxFunc);
    lightboxPrev.addEventListener('click', prevImage);
    lightboxNext.addEventListener('click', nextImage);
    zoomInBtn.addEventListener('click', zoomIn);
    zoomOutBtn.addEventListener('click', zoomOut);
    zoomResetBtn.addEventListener('click', resetZoom);
    
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightboxFunc();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (lightbox.classList.contains('active')) {
            if (e.key === 'Escape') {
                closeLightboxFunc();
            } else if (e.key === 'ArrowLeft') {
                prevImage();
            } else if (e.key === 'ArrowRight') {
                nextImage();
            } else if (e.key === '+' || e.key === '=') {
                zoomIn();
            } else if (e.key === '-') {
                zoomOut();
            } else if (e.key === '0') {
                resetZoom();
            }
        } else if (e.key === 'Escape') {
            if (taskModal.classList.contains('active')) {
                taskModal.classList.remove('active');
            } else if (previewOrderModal.classList.contains('active')) {
                previewOrderModal.classList.remove('active');
            } else if (editTaskModal.classList.contains('active')) {
                closeEditModalFunc();
            }
        }
    });
}

window.addEventListener('resize', () => {
    if (window.innerWidth > 992) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        hamburger.classList.remove('active');
    }
});

// Fungsi untuk mengaktifkan no-scroll pada body
function disableBodyScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none'; // Untuk mencegah scroll di mobile
}

// Fungsi untuk mengembalikan scroll pada body
function enableBodyScroll() {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
}

// Cari event listener yang membuka modal tugas (showTaskDetail)
const originalShowTaskDetail = showTaskDetail; // Simpan fungsi original jika ada
showTaskDetail = function(taskId) {
    if (originalShowTaskDetail) originalShowTaskDetail(taskId);
    disableBodyScroll();
};

// Cari event listener close modal tugas
closeModal.addEventListener('click', () => {
    taskModal.classList.remove('active');
    enableBodyScroll();
});

taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) {
        taskModal.classList.remove('active');
        enableBodyScroll();
    }
});

// Untuk keyboard escape (sudah ada di setupEventListeners, tambahkan enableBodyScroll)
const originalEscapeHandler = function(e) {
    if (e.key === 'Escape') {
        if (taskModal.classList.contains('active')) {
            taskModal.classList.remove('active');
            enableBodyScroll();
        } else if (previewOrderModal.classList.contains('active')) {
            previewOrderModal.classList.remove('active');
            enableBodyScroll(); // Opsional: terapkan juga untuk modal lain jika diinginkan
        } else if (editTaskModal.classList.contains('active')) {
            closeEditModalFunc();
            enableBodyScroll(); // Opsional
        }
    }
};