// Select User

function selectUser(userType) {
    const message = document.getElementById("loginMessage");

    if (message) {
        message.textContent =
            "You selected " + userType +
            ". Registration and login will be connected next.";
    }

    const loginSection = document.getElementById("login");

    if (loginSection) {
        loginSection.scrollIntoView({ behavior: "smooth" });
    }
}


// Welcome Message

const welcomeMessage = document.getElementById("welcomeMessage");

if (welcomeMessage) {
    const userData = JSON.parse(
        sessionStorage.getItem("nearNestUser") || "null"
    );

    const ownerData = JSON.parse(
        sessionStorage.getItem("nearNestOwner") || "null"
    );

    if (userData) {
        welcomeMessage.textContent =
            "Let's find your PG in " + userData.city + "!";
    } else if (ownerData) {
        welcomeMessage.textContent =
            "Welcome, " + ownerData.name + "! Here are the PG listings.";
    } else {
        welcomeMessage.textContent =
            "Explore available PG accommodations.";
    }
}


// User Registration - Save Seeker Details in MySQL

const registrationForm = document.getElementById("registrationForm");

if (registrationForm) {
    registrationForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const user = {
            name: document.getElementById("fullName").value.trim(),
            mobile: document.getElementById("mobile").value.trim(),
            purpose: document.getElementById("purpose")?.value || "",
            city: document.getElementById("city").value.trim(),
            area: document.getElementById("area").value.trim(),
            budget: document.getElementById("budget").value,
            roomType: document.getElementById("roomType").value
        };

        if (!user.name || !user.mobile || !user.city) {
            alert("Please enter your name, mobile number and city.");
            return;
        }

        try {
            const response = await fetch(
                "http://localhost:8080/register-seeker",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: new URLSearchParams({
                        fullName: user.name,
                        mobile: user.mobile,
                        purpose: user.purpose,
                        city: user.city,
                        area: user.area,
                        budget: user.budget,
                        roomType: user.roomType
                    })
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                alert(result.message || "Seeker registration failed.");
                return;
            }

            user.seekerId = result.seekerId;

            sessionStorage.setItem(
                "nearNestUser",
                JSON.stringify(user)
            );

            alert("Seeker registered successfully!");

            window.location.href = "pg-listings.html";

        } catch (error) {
            console.error("Seeker registration error:", error);

            alert(
                "Unable to connect to the backend. " +
                "Please check whether the Java server is running."
            );
        }
    });
}


// Display User Preferences

const userPreferences = document.getElementById("userPreferences");

if (userPreferences) {
    const userData = JSON.parse(
        sessionStorage.getItem("nearNestUser") || "null"
    );

    if (userData) {
        userPreferences.innerHTML = `
            <h2>Your Search Preferences</h2>
            <p><strong>City:</strong> ${userData.city}</p>
            <p><strong>Preferred Area:</strong> ${userData.area || "Any area"}</p>
            <p><strong>Monthly Budget:</strong> ${userData.budget}</p>
            <p><strong>Room Type:</strong> ${userData.roomType}</p>
        `;
    }
}


// Display PG Listings From MySQL Using All Four Filters

const pgListings = document.getElementById("pgListings");

if (pgListings) {

    const userData = JSON.parse(
        sessionStorage.getItem("nearNestUser") || "null"
    );

    const ownerData = JSON.parse(
        sessionStorage.getItem("nearNestOwner") || "null"
    );


    async function loadPGListings() {

        if (!userData && !ownerData) {
            pgListings.innerHTML = `
                <p>Please register to find PGs.</p>
            `;
            return;
        }


        pgListings.innerHTML = "<p>Loading PG listings...</p>";


        try {

            // Get PG details and photos from MySQL

            const response = await fetch(
                "http://localhost:8080/get-pgs"
            );


            const result = await response.json();


            if (!response.ok || !result.success) {

                pgListings.innerHTML = `
                    <p>Unable to load PG listings.</p>
                `;

                console.error("PG retrieval error:", result.message);
                return;
            }


            const pgList = result.pgs || [];

            let matchingPGs = [];


            if (userData) {

                matchingPGs = pgList.filter(pg => {

                    // City Filter

                    const cityMatch =
                        pg.city.trim().toLowerCase() ===
                        userData.city.trim().toLowerCase();


                    // Area Filter - Partial Matching

                    const preferredArea = (userData.area || "").trim();

                    const areaMatch =
                        preferredArea === "" ||
                        pg.area.trim().toLowerCase().includes(
                            preferredArea.toLowerCase()
                        );


                    // Budget Filter

                    const rent = Number(pg.rent);

                    let budgetMatch = false;


                    if (userData.budget === "Below 5000") {

                        budgetMatch = rent < 5000;

                    } else if (userData.budget === "5000-10000") {

                        budgetMatch = rent >= 5000 && rent <= 10000;

                    } else if (userData.budget === "10000-15000") {

                        budgetMatch = rent > 10000 && rent <= 15000;

                    } else if (userData.budget === "Above 15000") {

                        budgetMatch = rent > 15000;
                    }


                    // Room Type Filter

                    const roomTypeMatch =
                        userData.roomType.trim().toLowerCase() === "any" ||
                        pg.roomType.trim().toLowerCase() ===
                        userData.roomType.trim().toLowerCase();


                    return cityMatch &&
                           areaMatch &&
                           budgetMatch &&
                           roomTypeMatch;
                });

            } else if (ownerData) {

                // Owners can view all PG listings

                matchingPGs = pgList;
            }


            // Display Matching PGs

            if (matchingPGs.length === 0) {

                pgListings.innerHTML = `
                    <p>No PGs found matching your preferences.</p>
                    <p>Try changing your search preferences.</p>
                `;

                return;
            }


            // --------------------------------------------------
            // NEW PG LISTING CARD LAYOUT
            // --------------------------------------------------

            pgListings.innerHTML = matchingPGs.map((pg, index) => `

                <div class="pg-card"
                     style="
                        width:100%;
                        background:#ffffff;
                        border:1px solid #dbe4f5;
                        border-radius:18px;
                        padding:10px;
                        margin-bottom:18px;
                        display:grid;
                        grid-template-columns:32% 46% 22%;
                        min-height:210px;
                        overflow:hidden;
                        box-shadow:0 5px 18px rgba(30,70,160,0.08);
                        box-sizing:border-box;
                     ">


                    <!-- LEFT: PG IMAGE -->

                    <div class="pg-image-section"
                         style="
                            width:100%;
                            min-height:200px;
                            display:flex;
                            align-items:stretch;
                         ">

                        ${
                            pg.images && pg.images.length > 0

                            ? `
                                <img
                                    src="${pg.images[0]}"
                                    alt="PG Property"
                                    class="pg-main-image"
                                    style="
                                        width:100%;
                                        height:200px;
                                        object-fit:cover;
                                        display:block;
                                        border-radius:14px;
                                    "
                                >
                            `

                            : `
                                <div
                                    style="
                                        width:100%;
                                        height:200px;
                                        background:#f0f4ff;
                                        display:flex;
                                        align-items:center;
                                        justify-content:center;
                                        border-radius:14px;
                                        color:#31528f;
                                        font-weight:700;
                                        text-align:center;
                                    "
                                >
                                    No PG Photo Available
                                </div>
                            `
                        }

                    </div>

<!-- MIDDLE: PG INFORMATION -->

<div class="pg-info-section"
     style="
        padding:10px 22px;
        box-sizing:border-box;
        min-width:0;
     ">

    <h2
        style="
            margin:0 0 8px 0;
            color:#10245c;
            font-size:24px;
            font-weight:800;
        "
    >
        ${pg.name}
    </h2>

    <p
        style="
            margin:6px 0;
            color:#17376f;
            font-size:15px;
            font-weight:600;
        "
    >
        📍 ${pg.area}, ${pg.city}
    </p>

    <p
        style="
            margin:8px 0;
            color:#405681;
            font-size:14px;
            line-height:1.5;
        "
    >
        ${pg.address || "Address not provided"}
    </p>

    <!-- FACILITIES -->

    <div
        style="
            display:flex;
            flex-wrap:wrap;
            gap:10px;
            margin-top:14px;
        "
    >

        <span
            style="
                background:#edf3ff;
                color:#1548a5;
                padding:8px 12px;
                border-radius:20px;
                font-size:12px;
                font-weight:700;
            "
        >
            🛏️ ${pg.roomType}
        </span>

        <span
            style="
                background:#edf3ff;
                color:#1548a5;
                padding:8px 12px;
                border-radius:20px;
                font-size:12px;
                font-weight:700;
            "
        >
            🛏️ ${pg.beds} Beds
        </span>

        <span
            style="
                background:#edf3ff;
                color:#1548a5;
                padding:8px 12px;
                border-radius:20px;
                font-size:12px;
                font-weight:700;
            "
        >
            📶 Wi-Fi
        </span>

        <span
            style="
                background:#edf3ff;
                color:#1548a5;
                padding:8px 12px;
                border-radius:20px;
                font-size:12px;
                font-weight:700;
            "
        >
            🏠 ${pg.facilities || "Facilities"}
        </span>

    </div>

</div>


<!-- RIGHT: PRICE + SAFE + BUTTON -->

<div class="pg-price-section"
     style="
        border-left:2px solid #e1e8f5;
        padding:15px 18px;
        display:flex;
        flex-direction:column;
        justify-content:center;
        box-sizing:border-box;
     ">

    <!-- PRICE -->

    <div
        style="
            color:#145bea;
            font-size:29px;
            font-weight:900;
            margin-bottom:3px;
        "
    >
        ₹${pg.rent}
    </div>

    <div
        style="
            color:#10245c;
            font-size:14px;
            font-weight:700;
            margin-bottom:12px;
        "
    >
        per month
    </div>

    <!-- SAFE & SECURE BELOW PRICE -->

    <div
        style="
            display:inline-flex;
            align-items:center;
            width:max-content;
            background:#dcf8df;
            color:#14752b;
            padding:7px 12px;
            border-radius:18px;
            font-size:12px;
            font-weight:800;
            margin-bottom:12px;
        "
    >
        🛡️ Safe & Secure
    </div>

    <!-- BUTTON INSIDE RIGHT FIELD -->

    <button
        type="button"
        class="view-details-btn"
        data-pg-index="${index}"
        style="
            width:100%;
            padding:12px 14px;
            border:none;
            border-radius:10px;
            background:linear-gradient(135deg,#145bea,#1749c9);
            color:white;
            font-size:14px;
            font-weight:800;
            cursor:pointer;
            box-sizing:border-box;
        "
    >
        View Details
    </button>

</div>
                   

                    <!-- FULL DETAILS -->

                    <div
                        class="pg-full-details"
                        id="pgDetails${index}"
                        hidden
                        style="
                            grid-column:1 / -1;
                            padding:5px 18px 18px 18px;
                        "
                    >

                        <hr style="margin:18px 0;">


                        <h3>PG Information</h3>


                        <p>
                            <strong>PG Name:</strong>
                            ${pg.name}
                        </p>


                        <p>
                            <strong>City:</strong>
                            ${pg.city}
                        </p>


                        <p>
                            <strong>Area:</strong>
                            ${pg.area}
                        </p>


                        <p>
                            <strong>Address:</strong>
                            ${pg.address || "Not provided"}
                        </p>


                        <p>
                            <strong>Monthly Rent:</strong>
                            ₹${pg.rent}
                        </p>


                        <p>
                            <strong>Room Type:</strong>
                            ${pg.roomType}
                        </p>


                        <p>
                            <strong>Available Beds:</strong>
                            ${pg.beds}
                        </p>


                        <p>
                            <strong>Facilities:</strong>
                            ${pg.facilities}
                        </p>


                        <p>
                            <strong>Contact:</strong>
                            ${pg.contact}
                        </p>


                        <h3>Property Photos</h3>


                        <div
                            style="
                                display:flex;
                                flex-wrap:wrap;
                                gap:10px;
                            "
                        >

                            ${
                                pg.images && pg.images.length > 0

                                ? pg.images.map(img => `
                                    <img
                                        src="${img}"
                                        alt="PG Photo"
                                        style="
                                            width:140px;
                                            height:110px;
                                            object-fit:cover;
                                            border-radius:8px;
                                        "
                                    >
                                `).join("")

                                : "<p>No photos uploaded.</p>"
                            }

                        </div>


                        <button
                            type="button"
                            class="contact-owner-btn"
                            data-pg-index="${index}"
                            style="
                                width:100%;
                                margin-top:18px;
                                padding:12px;
                                border:none;
                                border-radius:8px;
                                background:#168447;
                                color:white;
                                font-size:15px;
                                font-weight:700;
                                cursor:pointer;
                            "
                        >
                            Contact PG Owner on WhatsApp
                        </button>

                    </div>

                </div>

            `).join("");


            // View Details and Contact Owner Buttons

            pgListings.addEventListener("click", function (event) {

                // Contact Owner on WhatsApp

                const contactButton =
                    event.target.closest(".contact-owner-btn");


                if (contactButton) {

                    const index =
                        Number(contactButton.dataset.pgIndex);

                    const selectedPG =
                        matchingPGs[index];


                    if (!selectedPG || !selectedPG.contact) {

                        alert(
                            "The PG owner's contact number is not available."
                        );

                        return;
                    }


                    let phone = String(selectedPG.contact)
                        .replace(/\D/g, "");


                    if (phone.length === 10) {

                        phone = "91" + phone;

                    } else if (
                        phone.length === 11 &&
                        phone.startsWith("0")
                    ) {

                        phone = "91" + phone.substring(1);
                    }


                    if (
                        phone.length !== 12 ||
                        !phone.startsWith("91")
                    ) {

                        alert(
                            "Please check the PG owner's mobile number. " +
                            "Enter a valid Indian mobile number."
                        );

                        return;
                    }


                    const message =
                        "Hello, I am interested in your PG, " +
                        selectedPG.name +
                        ", in " +
                        selectedPG.area +
                        ", " +
                        selectedPG.city +
                        ". Could you please share more details?";


                    const whatsappURL =
                        "https://wa.me/" +
                        phone +
                        "?text=" +
                        encodeURIComponent(message);


                    window.open(whatsappURL, "_blank");

                    return;
                }


                // Show or Hide PG Details

                const button =
                    event.target.closest(".view-details-btn");


                if (!button) return;


                const index =
                    button.dataset.pgIndex;


                const details =
                    document.getElementById(
                        "pgDetails" + index
                    );


                if (details.hidden) {

                    details.hidden = false;

                    button.textContent = "Hide Details";

                } else {

                    details.hidden = true;

                    button.textContent = "View Details";
                }

            });


        } catch (error) {

            console.error(
                "Loading PG listings error:",
                error
            );


            pgListings.innerHTML = `
                <p>Unable to connect to the NearNest server.</p>
                <p>Please check whether the Java backend is running.</p>
            `;
        }
    }


    loadPGListings();
}


// Owner Registration and Redirect to PG Details

const ownerForm =
    document.getElementById("ownerRegistrationForm");


if (ownerForm) {

    ownerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const owner = {

                name:
                    document
                        .getElementById("ownerName")
                        .value
                        .trim(),

                mobile:
                    document
                        .getElementById("ownerMobile")
                        .value
                        .trim(),

                pgName:
                    document
                        .getElementById("pgName")
                        .value
                        .trim(),

                city:
                    document
                        .getElementById("ownerCity")
                        .value
                        .trim(),

                area:
                    document
                        .getElementById("ownerArea")
                        .value
                        .trim(),

                address:
                    document
                        .getElementById("ownerAddress")
                        .value
                        .trim()
            };


            try {

                const response =
                    await fetch(
                        "http://localhost:8080/register-owner",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/x-www-form-urlencoded"
                            },

                            body: new URLSearchParams({

                                ownerName:
                                    owner.name,

                                mobile:
                                    owner.mobile
                            })
                        }
                    );


                const result =
                    await response.json();


                if (
                    !response.ok ||
                    !result.success
                ) {

                    alert(
                        result.message ||
                        "Owner registration failed."
                    );

                    return;
                }


                owner.ownerId =
                    result.ownerId;


                sessionStorage.setItem(
                    "nearNestOwner",
                    JSON.stringify(owner)
                );


                alert(
                    "Owner registered successfully!"
                );


                window.location.href =
                    "pg-details.html";


            } catch (error) {

                console.error(
                    "Owner registration error:",
                    error
                );


                alert(
                    "Unable to connect to the backend. " +
                    "Please check whether the Java server is running."
                );
            }
        }
    );
}


// Convert Uploaded Photos Into Base64

function readPhoto(file) {

    return new Promise((resolve, reject) => {

        const reader =
            new FileReader();


        reader.onload = function () {

            resolve(reader.result);
        };


        reader.onerror = function () {

            reject(
                new Error(
                    "Unable to read photo."
                )
            );
        };


        reader.readAsDataURL(file);
    });
}


// Save PG Details and Photos in MySQL

const pgDetailsForm =
    document.getElementById("pgDetailsForm");


if (pgDetailsForm) {

    // Auto-fill PG Details From Owner Registration

    const savedOwner =
        JSON.parse(
            sessionStorage.getItem(
                "nearNestOwner"
            ) || "null"
        );


    if (savedOwner) {

        const pgNameInput =
            document.getElementById("pgName");

        const cityInput =
            document.getElementById("city");

        const areaInput =
            document.getElementById("area");

        const contactInput =
            document.getElementById("contact");


        if (pgNameInput) {

            pgNameInput.value =
                savedOwner.pgName || "";
        }


        if (cityInput) {

            cityInput.value =
                savedOwner.city || "";
        }


        if (areaInput) {

            areaInput.value =
                savedOwner.area || "";
        }


        if (contactInput) {

            contactInput.value =
                savedOwner.mobile || "";
        }
    }


    pgDetailsForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const photoInput =
                document.getElementById("pgPhotos");


            const selectedPhotos =
                photoInput
                    ? Array.from(photoInput.files)
                    : [];


            try {

                if (
                    !savedOwner ||
                    !savedOwner.ownerId
                ) {

                    alert(
                        "Please register as a PG owner first."
                    );

                    return;
                }


                if (
                    selectedPhotos.length > 20
                ) {

                    alert(
                        "You can upload a maximum of 20 photos."
                    );

                    return;
                }


                const images =
                    await Promise.all(
                        selectedPhotos.map(
                            file => readPhoto(file)
                        )
                    );


                const pg = {

                    name:
                        document
                            .getElementById("pgName")
                            .value
                            .trim(),

                    city:
                        document
                            .getElementById("city")
                            .value
                            .trim(),

                    area:
                        document
                            .getElementById("area")
                            .value
                            .trim(),

                    address:
                        (
                            document
                                .getElementById("address")
                                ?.value
                                .trim() ||
                            savedOwner.address ||
                            ""
                        ),

                    rent:
                        Number(
                            document
                                .getElementById("rent")
                                .value
                        ),

                    roomType:
                        document
                            .getElementById("roomType")
                            .value,

                    beds:
                        Number(
                            document
                                .getElementById("beds")
                                .value
                        ),

                    facilities:
                        document
                            .getElementById("facilities")
                            .value
                            .trim(),

                    contact:
                        document
                            .getElementById("contact")
                            .value
                            .trim(),

                    images:
                        images
                };


                const formData =
                    new URLSearchParams();


                formData.append(
                    "ownerId",
                    savedOwner.ownerId
                );

                formData.append(
                    "pgName",
                    pg.name
                );

                formData.append(
                    "city",
                    pg.city
                );

                formData.append(
                    "area",
                    pg.area
                );

                formData.append(
                    "address",
                    pg.address
                );

                formData.append(
                    "rent",
                    pg.rent
                );

                formData.append(
                    "roomType",
                    pg.roomType
                );

                formData.append(
                    "beds",
                    pg.beds
                );

                formData.append(
                    "facilities",
                    pg.facilities
                );

                formData.append(
                    "contact",
                    pg.contact
                );


                formData.append(
                    "photoCount",
                    images.length
                );


                images.forEach(
                    (image, index) => {

                        formData.append(
                            "photo" + index,
                            image
                        );


                        formData.append(
                            "photoName" + index,
                            selectedPhotos[index].name
                        );
                    }
                );


                const response =
                    await fetch(
                        "http://localhost:8080/add-pg",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/x-www-form-urlencoded"
                            },

                            body: formData
                        }
                    );


                const result =
                    await response.json();


                if (
                    !response.ok ||
                    !result.success
                ) {

                    alert(
                        result.message ||
                        "Unable to save PG details and photos."
                    );

                    return;
                }


                // Keep local copy for compatibility with existing features

                pg.pgId =
                    result.pgId;


                let pgList =
                    JSON.parse(
                        localStorage.getItem(
                            "nearNestPGs"
                        ) || "[]"
                    );


                pgList.push(pg);


                localStorage.setItem(
                    "nearNestPGs",
                    JSON.stringify(pgList)
                );


                alert(
                    "PG details and " +
                    result.photoCount +
                    " photos saved successfully in MySQL!"
                );


                pgDetailsForm.reset();


                sessionStorage.removeItem(
                    "nearNestUser"
                );


                window.location.href =
                    "index.html";


            } catch (error) {

                console.error(
                    "PG saving error:",
                    error
                );


                alert(
                    "Unable to save PG details and photos. " +
                    "Check the Java backend and try smaller photos."
                );
            }
        }
    );
}