

// Xử lý popup đăng nhập

async function loginApi(username, password) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // Timeout 5s

        // Tạo payload không bao gồm password trong logs
        const payload = { username, password };

        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error('API error response:', errData);
            throw new Error(errData.message || `HTTP error ${response.status}`);
        }

        const data = await response.json();
        // Chỉ log thông tin không nhạy cảm
        console.log('API success response:', {
            user: data.user ? { username: data.user.username, id: data.user.id } : null,
            access_token: data.access_token ? '***' : null,
            message: data.message
        });
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        if (error.name === 'AbortError') {
            throw new Error('Yêu cầu hết thời gian. Vui lòng thử lại.');
        }
        throw error.message || 'Lỗi kết nối API';
    }
}

function showUsername(username) {
    var loginBtn = document.getElementById('loginBtn');
    var userInfoContainer = document.querySelector('.user-info');
    var usernameSpan = document.getElementById('headerUsername');
    var logoutBtn = document.getElementById('logoutBtn');
    var layerDropdown = document.getElementById('layerDropdownContainer');

    // Ẩn nút đăng nhập
    if (loginBtn) loginBtn.style.display = 'none';

    // Hiển thị container user-info
    if (userInfoContainer) {
        userInfoContainer.style.display = 'flex';
    }

    // Cập nhật username
    if (usernameSpan) {
        usernameSpan.textContent = username;
        usernameSpan.style.display = 'inline-block';
    }

    // Hiển thị nút logout
    if (logoutBtn) logoutBtn.style.display = 'inline-block';

    // Hiển thị dropdown "Thêm lớp"
    if (layerDropdown) layerDropdown.style.display = '';

    console.log('Đã hiển thị user info cho:', username);
}

function hideUsername() {
    var loginBtn = document.getElementById('loginBtn');
    var userInfoContainer = document.querySelector('.user-info');
    var usernameSpan = document.getElementById('headerUsername');
    var logoutBtn = document.getElementById('logoutBtn');
    var layerDropdown = document.getElementById('layerDropdownContainer');

    // Hiển thị nút đăng nhập
    if (loginBtn) loginBtn.style.display = '';

    // Ẩn container user-info
    if (userInfoContainer) {
        userInfoContainer.style.display = 'none';
    }

    // Xóa username
    if (usernameSpan) {
        usernameSpan.textContent = '';
        usernameSpan.style.display = 'none';
    }

    // Ẩn nút logout
    if (logoutBtn) logoutBtn.style.display = 'none';

    // Ẩn dropdown "Thêm lớp"
    if (layerDropdown) layerDropdown.style.display = 'none';

    console.log('Đã ẩn user info');
}

// Hàm hiển thị popup với animation
function showLoginPopup() {
    const loginPopup = document.getElementById('loginPopup');
    const popupContent = loginPopup.querySelector('.popup-content');
    if (loginPopup) {
        // Reset position để đảm bảo ở giữa
        popupContent.style.position = 'fixed';
        popupContent.style.top = '50%';
        popupContent.style.left = '50%';
        popupContent.style.transform = 'translate(-50%, -50%)';

        loginPopup.style.display = 'block';
        // Đảm bảo popup hiển thị ở giữa màn hình
        setTimeout(() => {
            loginPopup.style.opacity = '1';
        }, 10);
    }
}

// Hàm ẩn popup với animation
function hideLoginPopup() {
    const loginPopup = document.getElementById('loginPopup');
    if (loginPopup) {
        loginPopup.style.opacity = '0';
        setTimeout(() => {
            loginPopup.style.display = 'none';
        }, 300);
    }
}

// Hàm thêm hiệu ứng loading cho button
function setLoadingState(isLoading) {
    const submitBtn = document.getElementById('loginSubmitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');

    if (isLoading) {
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-block';
    } else {
        submitBtn.disabled = false;
        btnText.style.display = 'inline-block';
        btnLoading.style.display = 'none';
    }
}

// Hàm thêm hiệu ứng cho input
function setInputState(inputElement, state) {
    inputElement.classList.remove('error', 'success');
    if (state) {
        inputElement.classList.add(state);
    }
}

// ===== Auto logout theo thời hạn JWT =====
const TOKEN_LOGOUT_TIMER_KEY = '_logoutTimerId';

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

function clearAutoLogoutTimer() {
    if (window[TOKEN_LOGOUT_TIMER_KEY]) {
        clearTimeout(window[TOKEN_LOGOUT_TIMER_KEY]);
        window[TOKEN_LOGOUT_TIMER_KEY] = null;
    }
}

function performLogout() {
    console.log('Logout triggered, clearing localStorage...');
    localStorage.removeItem('username');
    localStorage.removeItem('access_token');
    localStorage.removeItem('role');
    var layerDropdown = document.getElementById('layerDropdownContainer');
    if (layerDropdown) layerDropdown.style.display = 'none';
    hideUsername();
    alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    location.reload();
}

function scheduleAutoLogoutFromToken(token, onExpire) {
    clearAutoLogoutTimer();
    const payload = parseJwt(token);
    if (!payload || !payload.exp) {
        if (typeof onExpire === 'function') onExpire();
        return;
    }
    const expiresAtMs = payload.exp * 1000;
    const delayMs = expiresAtMs - Date.now();
    if (delayMs <= 0) {
        if (typeof onExpire === 'function') onExpire();
        return;
    }
    window[TOKEN_LOGOUT_TIMER_KEY] = setTimeout(() => {
        if (typeof onExpire === 'function') onExpire();
    }, delayMs);
}

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOMContentLoaded');
    var loginPopup = document.getElementById('loginPopup');
    var closeLoginPopup = document.getElementById('closeLoginPopup');
    var loginBtn = document.getElementById('loginBtn');
    var loginForm = document.getElementById('loginForm');
    var usernameInput = document.getElementById('username');
    var passwordInput = document.getElementById('password');

    console.log('loginForm:', loginForm);

    // Mở popup khi click nút Đăng nhập
    if (loginBtn) {
        loginBtn.onclick = function () {
            showLoginPopup();
        };
    }

    // Đóng popup khi click dấu x
    if (closeLoginPopup) {
        closeLoginPopup.onclick = function () {
            hideLoginPopup();
        };
    }

    // Đóng popup khi click ra ngoài
    if (loginPopup) {
        loginPopup.onclick = function (event) {
            if (event.target === loginPopup) {
                hideLoginPopup();
            }
        };
    }

    // Đóng popup khi nhấn ESC
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && loginPopup.style.display === 'block') {
            hideLoginPopup();
        }
    });

    // Khi load trang, kiểm tra localStorage và hiển thị user info nếu đã đăng nhập
    function checkLoginStatus() {
        var savedUser = localStorage.getItem('username');
        var accessToken = localStorage.getItem('access_token');
        var layerDropdown = document.getElementById('layerDropdownContainer');

        console.log('Checking login status...');
        console.log('Saved user:', savedUser);
        console.log('Access token:', accessToken ? 'exists' : 'not found');

        if (savedUser && accessToken) {
            console.log('User is logged in, showing user info...');
            if (layerDropdown) layerDropdown.style.display = '';
            showUsername(savedUser);
            // Lên lịch tự đăng xuất theo exp của token
            scheduleAutoLogoutFromToken(accessToken, performLogout);
            if (typeof window.toggleAdminUserButton === 'function') {
                window.toggleAdminUserButton();
            }
        } else {
            console.log('User is not logged in, hiding user info...');
            if (layerDropdown) layerDropdown.style.display = 'none';
            hideUsername();
            clearAutoLogoutTimer();
            const adminContainer = document.getElementById('adminUserManageContainer');
            if (adminContainer) adminContainer.style.display = 'none';
        }
    }

    // Kiểm tra ngay khi load trang
    checkLoginStatus();

    // Xử lý submit form
    if (loginForm) {
        loginForm.onsubmit = async function (event) {
            event.preventDefault(); // Ngăn reload trang
            console.log('Đang xử lý đăng nhập...');

            var username = usernameInput.value.trim();
            var password = passwordInput.value.trim();

            // Reset input states
            setInputState(usernameInput, '');
            setInputState(passwordInput, '');

            // Validation
            if (!username) {
                setInputState(usernameInput, 'error');
                alert('Vui lòng nhập tên đăng nhập!');
                usernameInput.focus();
                return;
            }

            if (!password) {
                setInputState(passwordInput, 'error');
                alert('Vui lòng nhập mật khẩu!');
                passwordInput.focus();
                return;
            }

            try {
                setLoadingState(true);
                // Không log password để bảo mật
                console.log('Đang gửi yêu cầu đăng nhập cho user:', username);
                const data = await loginApi(username, password);

                if (data && data.user && data.access_token) {
                    localStorage.setItem('username', data.user.username);
                    localStorage.setItem('access_token', data.access_token);
                    if (data.user.role) localStorage.setItem('role', data.user.role);
                    // Hiển thị dropdown sau khi đăng nhập thành công
                    var layerDropdown = document.getElementById('layerDropdownContainer');
                    if (layerDropdown) layerDropdown.style.display = '';
                    showUsername(data.user.username);

                    // Lên lịch tự đăng xuất theo exp của token
                    scheduleAutoLogoutFromToken(data.access_token, performLogout);
                    if (typeof window.toggleAdminUserButton === 'function') {
                        window.toggleAdminUserButton();
                    }

                    // Hiệu ứng thành công
                    setInputState(usernameInput, 'success');
                    setInputState(passwordInput, 'success');

                    setTimeout(() => {
                        hideLoginPopup();
                        // Reset form và xóa password khỏi memory
                        loginForm.reset();
                        setInputState(usernameInput, '');
                        setInputState(passwordInput, '');
                        // Xóa password khỏi biến để bảo mật
                        password = null;
                    }, 1000);

                    alert('Đăng nhập thành công!');
                }
            } catch (err) {
                console.error('Lỗi đăng nhập:', err.message || err);
                setInputState(usernameInput, 'error');
                setInputState(passwordInput, 'error');
                alert('Đăng nhập thất bại: ' + (err.message || err));
            } finally {
                setLoadingState(false);
                // Xóa password khỏi memory sau khi xử lý xong
                password = null;
            }
        };
    } else {
        console.log('Không tìm thấy form đăng nhập!');
    }

    // Xử lý logout
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = function () {
            console.log('Logout clicked, clearing localStorage...');
            localStorage.removeItem('username');
            localStorage.removeItem('access_token');
            // Ẩn dropdown khi logout
            var layerDropdown = document.getElementById('layerDropdownContainer');
            if (layerDropdown) layerDropdown.style.display = 'none';
            hideUsername();
            const adminContainer = document.getElementById('adminUserManageContainer');
            if (adminContainer) adminContainer.style.display = 'none';
            localStorage.removeItem('role');
            alert('Đã đăng xuất!');
            // Reload lại trang sau khi logout
            location.reload();
        };
    }

    // Thêm hiệu ứng focus cho inputs
    if (usernameInput) {
        usernameInput.addEventListener('focus', function () {
            setInputState(this, '');
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener('focus', function () {
            setInputState(this, '');
        });
    }

    // Export function để có thể gọi từ bên ngoài
    window.showLoginPopup = showLoginPopup;
    window.hideLoginPopup = hideLoginPopup;
    window.showUsername = showUsername;
    window.hideUsername = hideUsername;
    window.checkLoginStatus = checkLoginStatus;
    window.login = function () {
        showLoginPopup();
    };

    // Test function để debug
    window.testUserInfo = function () {
        console.log('Testing user info display...');
        showUsername('test_user');
    };
}); 