    let web3Provider;
    let signer;
    let contract;

    const CONTRACT_ADDRESS = "0x149Dc83Afdc6E68A761e2B7602F9cE7B0b4707EA";

    const CONTRACT_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "spender", "type": "address" },
            { "internalType": "uint256", "name": "value", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "to", "type": "address" },
            { "internalType": "uint256", "name": "value", "type": "uint256" }
        ],
        "name": "transfer",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "name": "", "type": "uint8" }],
        "stateMutability": "view",
        "type": "function"
    }
];


            // Global state
            let currentUser = null;
            let userRole = null;
            // global variable

            
            // Wallet isolation - store wallet addresses per role/user
            let walletConnections = {
                students: {}, // email -> walletAddress
                coordinators: {}, // email -> walletAddress  
                faculty: {} // email -> walletAddress
            };

            // Task management data - Load from localStorage
            let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
            let taskSubmissions = JSON.parse(localStorage.getItem('taskSubmissions') || '[]');
            let eventComments = JSON.parse(localStorage.getItem('eventComments') || '{}');
            
            // Load wallet connections from localStorage
            walletConnections = JSON.parse(localStorage.getItem('walletConnections') || JSON.stringify(walletConnections));

            let leaderboardData = [
                { name: "Alice Johnson", balance: 250, rank: 1 },
                { name: "Bob Smith", balance: 200, rank: 2 },
                { name: "Carol Davis", balance: 175, rank: 3 },
                { name: "David Wilson", balance: 150, rank: 4 },
                { name: "Eva Brown", balance: 125, rank: 5 }
            ];

            let coordinatorTasks = JSON.parse(localStorage.getItem('coordinatorTasks') || '[]');
            let approvalRequests = [
                {
                    id: 1,
                    name: "John Coordinator",
                    email: "john@university.edu",
                    college: "Tech University",
                    event: "AI Hackathon 2024",
                    status: "pending"
                },
                {
                    id: 2,
                    name: "Sarah Manager",
                    email: "sarah@college.edu",
                    college: "Engineering College",
                    event: "Web Dev Challenge",
                    status: "pending"
                }
            ];

            // Initialize the application
            function init() {
    checkWalletConnection();
    setupEventListeners();

    // Initialize approvalRequests properly
    const storedRequests = localStorage.getItem('approvalRequests');
    if (storedRequests) {
        approvalRequests = JSON.parse(storedRequests);
    } else {
        approvalRequests = [
            { id: 1, name: "John Coordinator", email: "john@university.edu", college: "Tech University", event: "AI Hackathon 2024", status: "pending" },
            { id: 2, name: "Sarah Manager", email: "sarah@college.edu", college: "Engineering College", event: "Web Dev Challenge", status: "pending" }
        ];
        localStorage.setItem('approvalRequests', JSON.stringify(approvalRequests));
    }

    tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    coordinatorTasks = JSON.parse(localStorage.getItem('coordinatorTasks') || '[]');
    taskSubmissions = JSON.parse(localStorage.getItem('taskSubmissions') || '[]');
    eventComments = JSON.parse(localStorage.getItem('eventComments') || '{}');
    approvedCoordinators = JSON.parse(localStorage.getItem('approvedCoordinators') || '[]');

    checkLoggedInUser();
}


            // Setup event listeners
            function setupEventListeners() {
                document.getElementById('connectWallet').addEventListener('click', connectWallet);
                document.getElementById('logoutBtn').addEventListener('click', logout);
                document.getElementById('createTaskForm').addEventListener('submit', createTask);
                document.getElementById('taskSubmissionForm').addEventListener('submit', submitWork);
                document.getElementById('commentForm').addEventListener('submit', addComment);
            }

            // Wallet connection with account selection
    async function connectWallet(forceAccountSelection = true) {
        if (typeof window.ethereum !== 'undefined') {
            try {
                // Request accounts
                await window.ethereum.request({ method: 'eth_requestAccounts' });

                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                web3Provider = new ethers.providers.Web3Provider(window.ethereum);
                signer = web3Provider.getSigner();

                // ENS can fail on local/test networks, so just get raw address
                const address = await signer.getAddress().catch(() => accounts[0]);

                if (typeof CONTRACT_ADDRESS !== 'undefined' && typeof CONTRACT_ABI !== 'undefined') {
                    window.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
                    console.log('Contract initialized:', window.contract);
                }

                if (forceAccountSelection) return await showWalletSelection(accounts);

                showMessage('Wallet connected successfully!', 'success');
                updateWalletDisplay(address);

                return address;
            } catch (error) {
                showMessage('Failed to connect wallet: ' + error.message, 'error');
                return null;
            }
        } else {
            showMessage('MetaMask is not installed. Please install MetaMask to continue.', 'error');
            return null;
        }
    }











            // Show wallet selection modal
            async function showWalletSelection(accounts) {
                return new Promise((resolve) => {
                    // Create modal
                    const modal = document.createElement('div');
                    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
                    modal.innerHTML = `
                        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                            <h3 class="text-lg font-semibold mb-4">Select Wallet Account</h3>
                            <p class="text-gray-600 mb-4">Choose which wallet account you want to use:</p>
                            <div class="space-y-2" id="walletOptions">
                                ${accounts.map((account, index) => `
                                    <button onclick="selectWalletAccount('${account}', ${index})" 
                                            class="w-full text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                        <div class="font-medium">Account ${index + 1}</div>
                                        <div class="text-sm text-gray-500">${account}</div>
                                    </button>
                                `).join('')}
                            </div>
                            <button onclick="closeWalletModal()" class="mt-4 w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors">
                                Cancel
                            </button>
                        </div>
                    `;
                    
                    document.body.appendChild(modal);
                    
                    // Store resolve function globally
                    window.walletSelectionResolve = resolve;
                    window.walletSelectionModal = modal;
                });
            }

            // Select specific wallet account
            async function selectWalletAccount(address, index) {
                try {
                    // Switch to the selected account
                    await window.ethereum.request({
                        method: 'wallet_requestPermissions',
                        params: [{ eth_accounts: {} }]
                    });
                    
                    // Reconnect with the selected account
                    web3Provider = new ethers.providers.Web3Provider(window.ethereum);
                    signer = web3Provider.getSigner(index);
                    const selectedAddress = await signer.getAddress();
                    
                    updateWalletDisplay(selectedAddress);
                    
                    // Close modal and resolve
                    closeWalletModal();
                    window.walletSelectionResolve(selectedAddress);
                    
                    showMessage(`Connected to Account ${index + 1}`, 'success');
                } catch (error) {
                    showMessage('Failed to switch account: ' + error.message, 'error');
                    closeWalletModal();
                    window.walletSelectionResolve(null);
                }
            }

            // Update wallet display in navigation
            function updateWalletDisplay(address) {
                document.getElementById('connectWallet').textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
            }

            // Store wallet connection for specific user and role
            function storeWalletConnection(email, role, walletAddress) {
                const roleKey = role === 'student' ? 'students' : role === 'coordinator' ? 'coordinators' : 'faculty';
                walletConnections[roleKey][email] = walletAddress;
                localStorage.setItem('walletConnections', JSON.stringify(walletConnections));
            }

            // Get stored wallet for user
            function getStoredWallet(email, role) {
                const roleKey = role === 'student' ? 'students' : role === 'coordinator' ? 'coordinators' : 'faculty';
                return walletConnections[roleKey][email] || null;
            }

            // Close wallet selection modal
            function closeWalletModal() {
                if (window.walletSelectionModal) {
                    window.walletSelectionModal.remove();
                    window.walletSelectionModal = null;
                }
            }

            // Check if wallet is already connected
            async function checkWalletConnection() {
                if (typeof window.ethereum !== 'undefined') {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        web3Provider = new ethers.providers.Web3Provider(window.ethereum);
                        signer = web3Provider.getSigner();
                        const address = await signer.getAddress();
                        document.getElementById('connectWallet').textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
                    }
                }
            }

            // Role selection
            function selectRole(role) {
                userRole = role;
                document.getElementById('roleSelection').classList.add('hidden');
                document.getElementById('backBtn').classList.remove('hidden');
                
                // Hide all forms first
                document.getElementById('studentForm').classList.add('hidden');
                document.getElementById('coordinatorForm').classList.add('hidden');
                document.getElementById('facultyForm').classList.add('hidden');
                
                // Show selected form
                document.getElementById(`${role}Form`).classList.remove('hidden');
            }

            function backToRoleSelection() {
                document.getElementById('roleSelection').classList.remove('hidden');
                document.getElementById('backBtn').classList.add('hidden');
                document.getElementById('studentForm').classList.add('hidden');
                document.getElementById('coordinatorForm').classList.add('hidden');
                document.getElementById('facultyForm').classList.add('hidden');
            }

            // Registration functions
            async function registerStudent() {
                const name = document.getElementById('studentName').value;
                const email = document.getElementById('studentEmail').value;
                const college = document.getElementById('studentCollege').value;

                if (!name || !email || !college) {
                    showMessage('Please fill in all fields', 'error');
                    return;
                }

                const walletAddress = await connectWallet(true);
                if (!walletAddress) {
                    await ensureShmToken();
                    return;
                }
                
                async function ensureShmToken() {
    if (!window.ethereum) return;

    try {
        const tokenAddress = "0x149Dc83Afdc6E68A761e2B7602F9cE7B0b4707EA"; // SHM token
        const tokenSymbol = "SHM";
        const tokenDecimals = 18;
        const tokenImage = "https://link-to-your-token-logo.png"; // optional

        // Check if token already added
        const added = await window.ethereum.request({
            method: 'wallet_watchAsset',
            params: {
                type: 'ERC20',
                options: { address: tokenAddress, symbol: tokenSymbol, decimals: tokenDecimals, image: tokenImage }
            },
        });

        if (added) console.log("✅ SHM token added to MetaMask");
        else console.log("ℹ️ SHM token already exists in MetaMask or user rejected prompt");

    } catch (err) {
        console.error("Failed to add SHM token:", err);
    }
}

                // Check if student already exists
                const registeredStudents = JSON.parse(localStorage.getItem('registeredStudents') || '[]');
                const existingStudent = registeredStudents.find(s => s.email === email);
                
                if (existingStudent) {
                    showMessage('Student with this email already exists. Please use the login option.', 'error');
                    return;
                }

                currentUser = {
                    name,
                    email,
                    college,
                    role: 'student',
                    walletAddress,
                    balance: 0,
                    registeredAt: new Date().toISOString()
                };

                // Store wallet connection for this student
                storeWalletConnection(email, 'student', walletAddress);

                // Save student to localStorage
                registeredStudents.push(currentUser);
                localStorage.setItem('registeredStudents', JSON.stringify(registeredStudents));

                showDashboard('student');
                showMessage('Student registration successful! Your wallet is now linked to your student account.', 'success');
            }

            async function loginStudent() {
                const email = document.getElementById('studentLoginEmail').value;

                if (!email) {
                    showMessage('Please enter your registered email', 'error');
                    return;
                }

                const walletAddress = await connectWallet(true);
                if (!walletAddress) return;

                // Check if student is registered
                const registeredStudents = JSON.parse(localStorage.getItem('registeredStudents') || '[]');
                const student = registeredStudents.find(s => s.email === email);

                if (!student) {
                    showMessage('Email not found. Please register first.', 'error');
                    return;
                }

                // Check if this wallet was previously used for this student
                const storedWallet = getStoredWallet(email, 'student');
                if (storedWallet && storedWallet !== walletAddress) {
                    showMessage(`This email is linked to a different wallet (${storedWallet.slice(0, 6)}...${storedWallet.slice(-4)}). Please use the correct wallet or contact support.`, 'error');
                    return;
                }

                // Store/update wallet connection for this student
                storeWalletConnection(email, 'student', walletAddress);

                // Load student data including balance and submissions
                currentUser = {
                    ...student,
                    walletAddress
                };

                showDashboard('student');
                showMessage('Student login successful! Connected with your dedicated wallet.', 'success');
            }

            function showStudentRegister() {
                document.getElementById('studentRegisterSection').classList.remove('hidden');
                document.getElementById('studentLoginSection').classList.add('hidden');
                document.getElementById('studentRegisterTab').className = 'flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors';
                document.getElementById('studentLoginTab').className = 'flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors';
            }

            function showStudentLogin() {
                document.getElementById('studentRegisterSection').classList.add('hidden');
                document.getElementById('studentLoginSection').classList.remove('hidden');
                document.getElementById('studentRegisterTab').className = 'flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors';
                document.getElementById('studentLoginTab').className = 'flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors';
            }

            async function registerCoordinator() {
                const name = document.getElementById('coordinatorName').value;
                const email = document.getElementById('coordinatorEmail').value;
                const college = document.getElementById('coordinatorCollege').value;
                const event = document.getElementById('coordinatorEvent').value;

                if (!name || !email || !college || !event) {
                    showMessage('Please fill in all fields', 'error');
                    return;
                }

                const walletAddress = await connectWallet(true);
                if (!walletAddress) return;

                // Store wallet connection for this coordinator
                storeWalletConnection(email, 'coordinator', walletAddress);

                // Add the request to the approval queue
                const newRequest = {
                    id: Date.now(),
                    name,
                    email,
                    college,
                    event,
                    walletAddress,
                    status: 'pending'
                };
                
                approvalRequests.push(newRequest);
                // Save updated requests to localStorage
localStorage.setItem('approvalRequests', JSON.stringify(approvalRequests));


                showMessage('Coordinator registration submitted! Your wallet is linked to your coordinator account. Please wait for faculty approval.', 'success');
                
                // Reset form and go back to role selection
                document.getElementById('coordinatorName').value = '';
    document.getElementById('coordinatorEmail').value = '';
    document.getElementById('coordinatorEvent').value = '';
                backToRoleSelection();
                
            }

            async function loginFaculty() {
                const email = document.getElementById('facultyEmail').value;

                if (!email) {
                    showMessage('Please enter your college email', 'error');
                    return;
                }

                const walletAddress = await connectWallet(true);
                if (!walletAddress) return;

                // Check if this wallet was previously used for this faculty
                const storedWallet = getStoredWallet(email, 'faculty');
                if (storedWallet && storedWallet !== walletAddress) {
                    showMessage(`This email is linked to a different wallet (${storedWallet.slice(0, 6)}...${storedWallet.slice(-4)}). Please use the correct wallet.`, 'error');
                    return;
                }

                // Store wallet connection for this faculty
                storeWalletConnection(email, 'faculty', walletAddress);

                currentUser = {
                    email,
                    role: 'faculty',
                    walletAddress
                };

                showDashboard('faculty');
                showMessage('Faculty login successful! Connected with your dedicated wallet.', 'success');
            }

            function showCoordinatorRegister() {
                document.getElementById('coordinatorRegisterSection').classList.remove('hidden');
                document.getElementById('coordinatorLoginSection').classList.add('hidden');
                document.getElementById('coordinatorRegisterTab').className = 'flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors';
                document.getElementById('coordinatorLoginTab').className = 'flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors';
            }

            function showCoordinatorLogin() {
                document.getElementById('coordinatorRegisterSection').classList.add('hidden');
                document.getElementById('coordinatorLoginSection').classList.remove('hidden');
                document.getElementById('coordinatorRegisterTab').className = 'flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors';
                document.getElementById('coordinatorLoginTab').className = 'flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors';
            }

            async function loginCoordinator() {
                const email = document.getElementById('coordinatorLoginEmail').value;

                if (!email) {
                    showMessage('Please enter your registered email', 'error');
                    return;
                }

                const walletAddress = await connectWallet(true);
                if (!walletAddress) return;

                // Check if coordinator is approved
                const approvedCoordinators = JSON.parse(localStorage.getItem('approvedCoordinators') || '[]');
                const coordinator = approvedCoordinators.find(c => c.email === email);

                if (!coordinator) {
                    showMessage('Email not found or not approved yet. Please register first or wait for faculty approval.', 'error');
                    return;
                }

                // Check if this wallet was previously used for this coordinator
                const storedWallet = getStoredWallet(email, 'coordinator');
                if (storedWallet && storedWallet !== walletAddress) {
                    showMessage(`This email is linked to a different wallet (${storedWallet.slice(0, 6)}...${storedWallet.slice(-4)}). Please use the correct wallet.`, 'error');
                    return;
                }

                // Store/update wallet connection for this coordinator
                storeWalletConnection(email, 'coordinator', walletAddress);

                currentUser = {
                    name: coordinator.name,
                    email: coordinator.email,
                    college: coordinator.college,
                    event: coordinator.event,
                    role: 'coordinator',
                    walletAddress,
                    approved: true
                };

                showDashboard('coordinator');
                showMessage('Coordinator login successful! Connected with your dedicated wallet.', 'success');
            }

            // Dashboard functions
            function showDashboard(role) {
                document.getElementById('authSection').classList.add('hidden');
                document.getElementById('studentDashboard').classList.add('hidden');
                document.getElementById('coordinatorDashboard').classList.add('hidden');
                document.getElementById('facultyDashboard').classList.add('hidden');

                document.getElementById(`${role}Dashboard`).classList.remove('hidden');
                
                // Update navigation
                document.getElementById('userProfile').classList.remove('hidden');
                document.getElementById('connectWallet').classList.add('hidden');
                document.getElementById('logoutBtn').classList.remove('hidden');
                
                if (currentUser.name) {
                    document.getElementById('userName').textContent = currentUser.name;
                }
                
                if (currentUser.college) {
                    document.getElementById('collegeName').textContent = currentUser.college;
                }

                // Load dashboard content
                if (role === 'student') {
                    loadStudentDashboard();
                } else if (role === 'coordinator') {
                    loadCoordinatorDashboard();
                } else if (role === 'faculty') {
                    loadFacultyDashboard();
                }
            }

            function loadStudentDashboard() {
                // Update balance
                document.getElementById('userBalance').textContent = `${currentUser.balance || 0} SHM`;
                
                // Load tasks
                const tasksList = document.getElementById('tasksList');
                tasksList.innerHTML = '';
                
                if (tasks.length === 0) {
                    tasksList.innerHTML = '<p class="text-gray-500 text-center py-8">No tasks available yet. Tasks will appear here when event coordinators create them!</p>';
                } else {
                    tasks.forEach(task => {
                        const taskCard = createTaskCard(task, 'student');
                        tasksList.appendChild(taskCard);
                    });
                }

                // Load leaderboard
                loadLeaderboard();
            }

            function loadCoordinatorDashboard() {
                const coordinatorTasksList = document.getElementById('coordinatorTasks');
                coordinatorTasksList.innerHTML = '';
                
                if (coordinatorTasks.length === 0) {
                    coordinatorTasksList.innerHTML = '<p class=" text-center py-4">No tasks created yet. Create your first task above!</p>';
                } else {
                    coordinatorTasks.forEach(task => {
                        const taskCard = createTaskCard(task, 'coordinator');
                        coordinatorTasksList.appendChild(taskCard);
                    });
                }
            }

            function loadFacultyDashboard() {
                const approvalTable = document.getElementById('approvalRequests');
                approvalTable.innerHTML = '';
                
                approvalRequests.forEach(request => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${request.name}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${request.email}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${request.college}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${request.event}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button onclick="approveSubmission('${submission.studentWalletAddress}', ${submission.amount || 10})"
                                class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors">
                                Approve
                            </button>



                            <button onclick="rejectRequest(${request.id})" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors">
                                Reject
                            </button>
                        </td>
                    `;
                    approvalTable.appendChild(row);
                });
            }

            function createTaskCard(task, userType) {
                const card = document.createElement('div');
                 card.className = 'bg-white rounded-lg p-4 card-hover border border-gray-200';
                
                const deadline = new Date(task.deadline).toLocaleDateString();
                const submissionCount = taskSubmissions.filter(s => s.taskId === task.id).length;
                
                let actionButton = '';
                let statusBadge = '';
                
                if (userType === 'student') {
                    const userSubmission = taskSubmissions.find(s => s.taskId === task.id && s.studentEmail === currentUser.email);
                    if (userSubmission) {
                         statusBadge = `<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">Submitted</span>`;
            actionButton = `<button onclick="viewTaskDetails(${task.id})" class="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">View Details</button>`;
                    } else {
            actionButton = `<button onclick="viewTaskDetails(${task.id})" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">View & Accept</button>`;
                    }
                } else if (userType === 'coordinator') {
        statusBadge = `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">${submissionCount} submissions</span>`;
                    actionButton = `<button onclick="reviewTask(${task.id})" class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">Review Submissions</button>`;
                } else if (userType === 'coordinator') {
    statusBadge = `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">${submissionCount} submissions</span>`;
    actionButton = `
         <div class="flex space-x-2">
                <button onclick="reviewTask(${task.id})" 
                    class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                    Review Submissions
                </button>
            <button onclick="deleteTask(${task.id})" 
                    class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
                    Delete
                </button>
        </div>
    `;
}

                
                card.innerHTML = `
                     <div class="flex justify-between items-start mb-3">
            <h3 class="text-lg font-semibold ">${task.title}</h3>
                        <div class="flex space-x-2">
                            ${statusBadge}
                <span class="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm font-medium">${task.reward} SHM</span>
                        </div>
                    </div>
                    <p class=" mb-3 mb-3">${task.description}</p>
                    <div class="flex justify-between items-center">
                        <div class="text-sm ">
                            <p>Deadline: ${deadline}</p>
                            ${userType === 'student' ? `<p>By: ${task.creator}</p>` : ''}
                        </div>
                        ${actionButton}
                    </div>
                `;
                
                return card;
            }

            function loadLeaderboard() {
                const leaderboard = document.getElementById('leaderboard');
                leaderboard.innerHTML = '';
                
                leaderboardData.forEach((user, index) => {
                    const item = document.createElement('div');
                    item.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
                    
                    let medalIcon = '';
                    if (index === 0) medalIcon = '🥇';
                    else if (index === 1) medalIcon = '🥈';
                    else if (index === 2) medalIcon = '🥉';
                    else medalIcon = `${index + 1}.`;
                    
                    item.innerHTML = `
                        <div class="flex items-center space-x-3">
                            <span class="text-lg">${medalIcon}</span>
                            <span class="font-medium text-gray-800">${user.name}</span>
                        </div>
                        <span class="font-bold text-purple-600">${user.balance} SHM</span>
                    `;
                    
                    leaderboard.appendChild(item);
                });
            }

            // Task management functions
            function createTask(event) {
                event.preventDefault();
                
                const title = document.getElementById('taskTitle').value;
                const description = document.getElementById('taskDescription').value;
                const reward = parseInt(document.getElementById('taskReward').value);
                const deadline = document.getElementById('taskDeadline').value;
                
                if (!title || !description || !reward || !deadline) {
                    showMessage('Please fill in all fields', 'error');
                    return;
                }
                
                const newTask = {
                    id: Date.now(),
                    title,
                    description,
                    reward,
                    deadline,
                    creator: currentUser.name,
                    creatorEmail: currentUser.email,
                    eventName: currentUser.event,
                    status: 'available'
                };
                
                coordinatorTasks.push(newTask);
                tasks.push(newTask); // Add to global tasks for students to see
                
                // Save tasks to localStorage
                localStorage.setItem('tasks', JSON.stringify(tasks));
                localStorage.setItem('coordinatorTasks', JSON.stringify(coordinatorTasks));
                
                // Initialize comments for this event if not exists
                if (!eventComments[currentUser.event]) {
                    eventComments[currentUser.event] = [];
                    localStorage.setItem('eventComments', JSON.stringify(eventComments));
                }
                
                // Clear form
                document.getElementById('createTaskForm').reset();
                
                // Reload coordinator dashboard
                loadCoordinatorDashboard();
                
                showMessage('Task created successfully!', 'success');
            }

            function viewTaskDetails(taskId) {
                const task = tasks.find(t => t.id === taskId);
                if (!task) return;
                
                // Hide all dashboards
                document.getElementById('studentDashboard').classList.add('hidden');
                document.getElementById('taskDetailsPage').classList.remove('hidden');
                
                // Populate task details
                document.getElementById('taskRewardBadge').textContent = `${task.reward} SHM`;
                document.getElementById('taskDetailsContent').innerHTML = `
                    <h1 class="text-2xl font-bold text-gray-800 mb-2">${task.title}</h1>
                    <p class="text-gray-600 mb-4">${task.description}</p>
                    <div class="grid grid-cols-2 gap-4 text-sm text-gray-500">
                        <div>
                            <strong>Event:</strong> ${task.eventName}
                        </div>
                        <div>
                            <strong>Coordinator:</strong> ${task.creator}
                        </div>
                        <div>
                            <strong>Deadline:</strong> ${new Date(task.deadline).toLocaleDateString()}
                        </div>
                        <div>
                            <strong>Reward:</strong> ${task.reward} SHM Tokens
                        </div>
                    </div>
                `;
                
                // Check if user already submitted
                const userSubmission = taskSubmissions.find(s => s.taskId === taskId && s.studentEmail === currentUser.email);
                const submissionSection = document.getElementById('taskSubmissionSection');
                
                if (userSubmission) {
                    submissionSection.innerHTML = `
                        <h3 class="text-lg font-semibold mb-4 text-green-600">✓ Work Submitted</h3>
                        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p class="text-sm text-gray-600 mb-2"><strong>Your submission:</strong></p>
                            <p class="text-gray-800 mb-2">${userSubmission.description}</p>
                            ${userSubmission.link ? `<p class="text-sm"><strong>Link:</strong> <a href="${userSubmission.link}" target="_blank" class="text-blue-600 hover:underline">${userSubmission.link}</a></p>` : ''}
                            <p class="text-xs text-gray-500 mt-2">Status: ${userSubmission.status}</p>
                        </div>
                    `;
                }
                
                // Load comments for this event
                loadEventComments(task.eventName);
                
                // Store current task ID for submission
                window.currentTaskId = taskId;
                window.currentEventName = task.eventName;
            }

            function submitWork(event) {
                console.log("DEBUG: currentUser.walletAddress =", currentUser.walletAddress);
                event.preventDefault();
                
                const description = document.getElementById('submissionDescription').value;
                const link = document.getElementById('submissionLink').value;
                
                if (!description) {
                    showMessage('Please describe your work', 'error');
                    return;
                }
                
            const submission = {
        id: Date.now(),
        taskId: window.currentTaskId,
        studentName: currentUser.name,
        studentEmail: currentUser.email,
        studentWalletAddress: currentUser.walletAddress, // <- important
        description,
        link,
        status: 'pending',
        submittedAt: new Date().toISOString()
    };

                
                taskSubmissions.push(submission);
                
                // Save submissions to localStorage
                localStorage.setItem('taskSubmissions', JSON.stringify(taskSubmissions));
                
                showMessage('Work submitted successfully! Waiting for coordinator review.', 'success');
                
                // Refresh the task details to show submission
                viewTaskDetails(window.currentTaskId);
            }

            function reviewTask(taskId) {
                const task = coordinatorTasks.find(t => t.id === taskId);
                if (!task) return;
                
                // Hide coordinator dashboard and show review page
                document.getElementById('coordinatorDashboard').classList.add('hidden');
                document.getElementById('taskReviewPage').classList.remove('hidden');
                
                // Populate task review content
                document.getElementById('taskReviewContent').innerHTML = `
                    <h1 class="text-2xl font-bold text-gray-800 mb-2">${task.title}</h1>
                    <p class="text-gray-600 mb-4">${task.description}</p>
                    <div class="grid grid-cols-2 gap-4 text-sm text-gray-500 mb-6">
                        <div><strong>Deadline:</strong> ${new Date(task.deadline).toLocaleDateString()}</div>
                        <div><strong>Reward:</strong> ${task.reward} SHM Tokens</div>
                    </div>
                `;
                
                // Load submissions for this task
                const submissions = taskSubmissions.filter(s => s.taskId === taskId);
                const submissionsList = document.getElementById('submissionsList');
                
                if (submissions.length === 0) {
                    submissionsList.innerHTML = '<p class="text-gray-500 text-center py-4">No submissions yet.</p>';
                } else {
                    submissionsList.innerHTML = '';
                    submissions.forEach(submission => {
                        const submissionCard = createSubmissionCard(submission);
                        submissionsList.appendChild(submissionCard);
                    });
                }
            }
            function deleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this task?")) return;

    // Remove from coordinatorTasks
    coordinatorTasks = coordinatorTasks.filter(t => t.id !== taskId);

    // Remove from global tasks (students see this)
    tasks = tasks.filter(t => t.id !== taskId);

    // Save updated lists
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('coordinatorTasks', JSON.stringify(coordinatorTasks));

    // Also clean up submissions related to this task
    taskSubmissions = taskSubmissions.filter(s => s.taskId !== taskId);
    localStorage.setItem('taskSubmissions', JSON.stringify(taskSubmissions));

    showMessage("Task deleted successfully!", "success");

    // Reload dashboard
    loadCoordinatorDashboard();
}


            function createSubmissionCard(submission) {
    const task = tasks.find(t => t.id === submission.taskId);
    const reward = task ? task.reward : 10; // fallback reward

    const card = document.createElement('div');
    card.className = 'bg-gray-50 border border-gray-200 rounded-lg p-4';

    const statusColor = submission.status === 'approved' ? 'green' : submission.status === 'rejected' ? 'red' : 'yellow';

    card.innerHTML = `
        <div class="flex justify-between items-start mb-3">
            <div>
                <h4 class="font-semibold text-gray-800">${submission.studentName}</h4>
                <p class="text-sm text-gray-500">${submission.studentEmail}</p>
            </div>
            <span class="bg-${statusColor}-100 text-${statusColor}-800 px-2 py-1 rounded-full text-xs font-medium">${submission.status}</span>
        </div>
        <p class="text-gray-700 mb-3">${submission.description}</p>
        ${submission.link ? `<p class="text-sm mb-3"><strong>Link:</strong> <a href="${submission.link}" target="_blank" class="text-blue-600 hover:underline">${submission.link}</a></p>` : ''}
        <p class="text-xs text-gray-500 mb-3">Submitted: ${new Date(submission.submittedAt).toLocaleString()}</p>
        ${submission.status === 'pending' ? `
            <div class="flex space-x-2">
                <button onclick="approveSubmission('${submission.studentWalletAddress}', ${reward})" class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors">
                    Approve
                </button>
                <button onclick="rejectSubmission(${submission.id})" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors">
                    Reject
                </button>
            </div>
        ` : ''}
    `;
    return card;
}


       async function approveSubmission(studentAddress, amount) {
    try {
        console.log("DEBUG: studentAddress =", studentAddress);
        console.log("DEBUG: amount =", amount);

        if (!studentAddress) {
            alert("❌ Student wallet address is undefined!");
            return;
        }

        if (!window.contract) {
            alert("❌ Smart contract is not initialized. Connect wallet first.");
            return;
        }

        // Get token decimals dynamically from contract
        const decimals = await window.contract.decimals();

        // Convert amount to correct units
        const parsedAmount = ethers.utils.parseUnits(amount.toString(), decimals);

        // Send SHM tokens
        const tx = await window.contract.transfer(studentAddress, parsedAmount);
        console.log("Transaction sent:", tx.hash);

        const receipt = await tx.wait();
        console.log("Transaction confirmed:", receipt);
        alert(`✅ Sent ${amount} SHM to ${studentAddress}`);
    } catch (error) {
        console.error("Transaction failed:", error);
        if (error.code === 4001) alert("❌ Transaction rejected by user.");
        else alert("❌ Transaction failed, check console for details");
    }
}












            function rejectSubmission(submissionId) {
                const submission = taskSubmissions.find(s => s.id === submissionId);
                if (submission) {
                    submission.status = 'rejected';
                    
                    // Save updated submissions
                    localStorage.setItem('taskSubmissions', JSON.stringify(taskSubmissions));
                    
                    showMessage(`Rejected ${submission.studentName}'s submission.`, 'success');
                    
                    // Refresh the review page
                    const task = coordinatorTasks.find(t => t.id === submission.taskId);
                    reviewTask(task.id);
                }
            }

            // Navigation functions
            function backToStudentDashboard() {
                document.getElementById('taskDetailsPage').classList.add('hidden');
                document.getElementById('studentDashboard').classList.remove('hidden');
            }

            function backToCoordinatorDashboard() {
                document.getElementById('taskReviewPage').classList.add('hidden');
                document.getElementById('coordinatorDashboard').classList.remove('hidden');
            }

            // Comment system
            function loadEventComments(eventName) {
                const commentsList = document.getElementById('commentsList');
                const comments = eventComments[eventName] || [];
                
                commentsList.innerHTML = '';
                
                if (comments.length === 0) {
                    commentsList.innerHTML = '<p class="text-gray-500 text-center py-4">No comments yet. Be the first to start the discussion!</p>';
                } else {
                    comments.forEach(comment => {
                        const commentDiv = document.createElement('div');
                        commentDiv.className = 'bg-white border border-gray-200 rounded-lg p-3';
                        commentDiv.innerHTML = `
                            <div class="flex justify-between items-start mb-2">
                                <span class="font-medium text-gray-800">${comment.userName}</span>
                                <span class="text-xs text-gray-500">${new Date(comment.timestamp).toLocaleString()}</span>
                            </div>
                            <p class="text-gray-700">${comment.text}</p>
                        `;
                        commentsList.appendChild(commentDiv);
                    });
                }
                
                // Scroll to bottom
                commentsList.scrollTop = commentsList.scrollHeight;
            }

            function addComment(event) {
                event.preventDefault();
                
                const commentText = document.getElementById('commentInput').value.trim();
                if (!commentText) return;
                
                const comment = {
                    id: Date.now(),
                    userName: currentUser.name,
                    userEmail: currentUser.email,
                    text: commentText,
                    timestamp: new Date().toISOString()
                };
                
                if (!eventComments[window.currentEventName]) {
                    eventComments[window.currentEventName] = [];
                }
                
                eventComments[window.currentEventName].push(comment);
                
                // Save comments to localStorage
                localStorage.setItem('eventComments', JSON.stringify(eventComments));
                
                // Clear input and reload comments
                document.getElementById('commentInput').value = '';
                loadEventComments(window.currentEventName);
            }

            // Faculty approval functions
            function approveRequest(requestId) {
                const request = approvalRequests.find(r => r.id === requestId);
                if (request) {
                    request.status = 'approved';
                    
                    // Store approved coordinator for future login
                    const approvedCoordinators = JSON.parse(localStorage.getItem('approvedCoordinators') || '[]');
                    approvedCoordinators.push({
                        name: request.name,
                        email: request.email,
                        college: request.college,
                        event: request.event,
                        walletAddress: request.walletAddress
                    });
                    localStorage.setItem('approvedCoordinators', JSON.stringify(approvedCoordinators));
                    
                    approvalRequests = approvalRequests.filter(r => r.id !== requestId);
                    showMessage(`Approved ${request.name} for ${request.event}. They can now login as a coordinator.`, 'success');
                    loadFacultyDashboard();
                }
            }

            function rejectRequest(requestId) {
                const request = approvalRequests.find(r => r.id === requestId);
                if (request) {
                    approvalRequests = approvalRequests.filter(r => r.id !== requestId);
                    showMessage(`Rejected ${request.name}'s request`, 'success');
                    loadFacultyDashboard();
                }
            }

            // Utility functions
            function logout() {
                currentUser = null;
                userRole = null;
                web3Provider = null;
                signer = null;
                
                // Reset UI
                document.getElementById('authSection').classList.remove('hidden');
                document.getElementById('studentDashboard').classList.add('hidden');
                document.getElementById('coordinatorDashboard').classList.add('hidden');
                document.getElementById('facultyDashboard').classList.add('hidden');
                document.getElementById('userProfile').classList.add('hidden');
                document.getElementById('connectWallet').classList.remove('hidden');
                document.getElementById('logoutBtn').classList.add('hidden');
                
                // Reset forms
                backToRoleSelection();
                
                document.getElementById('connectWallet').textContent = 'Connect MetaMask';
                document.getElementById('collegeName').textContent = '';
                
                showMessage('Logged out successfully', 'success');
            }

            function showMessage(message, type) {
                const container = document.getElementById('messageContainer');
                const messageDiv = document.createElement('div');
                
                const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
                messageDiv.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg mb-2 max-w-sm`;
                messageDiv.textContent = message;
                
                container.appendChild(messageDiv);
                
                setTimeout(() => {
                    messageDiv.remove();
                }, 5000);
            }

            // Initialize the application when the page loads
            document.addEventListener('DOMContentLoaded', init);

