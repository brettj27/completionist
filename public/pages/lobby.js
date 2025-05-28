document.addEventListener("DOMContentLoaded", () => {
    function createToken(length) {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
        let token = "";
        for (let i = 0; i < length; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    document.getElementById("createGameBtn").addEventListener("click", async () => {
        const name = prompt("Enter your name:");
        if (!name) return;

        const token = createToken(8);
        console.log("🔑 Creating game with token:", token);

        const gameRef = db.collection("games").doc(token);

        try {
            await gameRef.set({
                players: {
                    [name]: { words: [], score: 0, finished: false }
                }
            });
            console.log("✅ Game created and written to Firestore");

            navigator.clipboard.writeText(token)
                .then(() => console.log("Copied to clipboard!"))
                .catch(err => console.error("Copy failed:", err));
            document.getElementById("gameLinkText").innerText = token;
            document.getElementById("waitingModal").style.display = "flex";

            db.collection("games").doc(token).onSnapshot((docSnap) => {
                const players = docSnap.data().players || {};
                console.log("📡 Listening to players:", players);

                if (Object.keys(players).length === 2) {
                    console.log("🎉 Two players joined, redirecting!");
                    window.location.href =`${window.location.origin}/game?game=${token}&name=${encodeURIComponent(name)}&creator=true`;
                }
            });

        } catch (err) {
            console.error("❌ Failed to write to Firestore:", err);
            alert("Could not create game. Check the console for errors.");
        }
    });



    document.getElementById("joinGameBtn").addEventListener("click", async () => {
        const code = document.getElementById("joinInput").value.trim();
        if (code.length < 4) {
            alert("Please enter a valid game code.");
            return;
        }

        const name = prompt("Enter your name:");
        if (!name) return;

        console.log("⚠️ Token from URL:", code);

        const gameRef = db.collection("games").doc(code);
        const docSnap = await gameRef.get();

        if (!docSnap.exists) {
            alert("Game not found.");
            return;
        }

        const data = docSnap.data();
        const players = data.players || {};

        if (Object.keys(players).length >= 2) {
            alert("This game already has two players.");
            return;
        }

        // Add self to game
        players[name] = { words: [], score: 0, finished: false };
        await gameRef.set({ players }, { merge: true });
        console.log("📤 Redirecting with:", { code, name });
        console.log("📤 Full URL:", `game.html?game=${code}&name=${encodeURIComponent(name)}`);
        // Will navigate to http://localhost:3000/game?game=XYZ&name=Bob
        window.location.href =`${window.location.origin}/game?game=${code}&name=${encodeURIComponent(name)}&creator=false`;

    });
});