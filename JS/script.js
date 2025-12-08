console.log("Now we work on JavaScript");

// /function hy jo return kry ga tmam song jo song k folder mn pary hein wahan sy / 

let currentSong = new Audio(); 
let songs;
let currFolder;

function secondsToMinutesSecond(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

async function getSongs(folder) {
    currFolder = folder;
    let a = await fetch(`http://127.0.0.1:5500/${folder}/`);
    let response = await a.text();

    let div = document.createElement("div");
    div.innerHTML = response;

    songs = [];

    let as = div.getElementsByTagName("a");

    for (let index = 0; index < as.length; index++) {
        const element = as[index];
        if (element.href.endsWith(".mp3")) {
            songs.push(element.href.split(`/${folder}/`)[1]);
        }
    }

    let songOl = document.querySelector(".songList").getElementsByTagName("ol")[0];
    songOl.innerHTML = ""; 

    for (const song of songs) {
        songOl.innerHTML += `
            <li>
                <img class="invert" src="img/music.svg" alt="">
                <div class="info">
                    <div>${song.replaceAll("%20", " ")}</div>
                    <div>Unknown</div> 
                </div>
                <div class="playNow">
                    <span>Play Now</span>
                    <img class="invert" src="img/play.svg" alt="">
                </div>
            </li>`;
    }

    Array.from(document.querySelector(".songList").getElementsByTagName("li")).forEach(e => {
        e.addEventListener("click", element => {
            playMusic(e.querySelector(".info").firstElementChild.innerHTML.trim());
        });
    });

    return songs;
}


async function displayAlbums() {
  try {
    const base = location.origin; // ensures same origin (http://127.0.0.1:5500 or your host)
    const listRes = await fetch(`${base}/songs/`);
    if (!listRes.ok) {
      console.error("Could not fetch /songs/ — server returned", listRes.status);
      return;
    }

    const listHtml = await listRes.text();
    const temp = document.createElement("div");
    temp.innerHTML = listHtml;

    const anchors = Array.from(temp.getElementsByTagName("a"));
    const cardContainer = document.querySelector(".cardContainer");
    if (!cardContainer) {
      console.error("No .cardContainer found in DOM");
      return;
    }

    // Clear existing cards
    cardContainer.innerHTML = "";

    for (const a of anchors) {
      try {
        // ensure this anchor is a songs folder link
        const url = new URL(a.href, base);
        if (!url.pathname.includes("/songs/")) continue;

        // folder name = last pathname segment (robust to trailing slash)
        const folder = url.pathname.replace(/\/$/, "").split("/").pop();
        if (!folder || folder.includes(".")) continue; // skip files and empty

        // fetch metadata for folder
        const infoRes = await fetch(`${base}/songs/${folder}/info.json`);
        if (!infoRes.ok) {
          console.warn(`No info.json for songs/${folder} (status ${infoRes.status}), skipping metadata`);
        }

        let info = { title: folder, description: "" };
        if (infoRes && infoRes.ok) {
          try { info = await infoRes.json(); } catch (err) { console.warn("Invalid JSON in info.json for", folder); }
        }

        // create card element (avoid innerHTML +=)
        const card = document.createElement("div");
        card.className = "card";
        card.dataset.folder = folder;
        card.innerHTML = `
          <div class="play">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5" stroke-linejoin="round" />
            </svg>
          </div>
          <img src="/songs/${folder}/nposter.jpg" alt="${escapeHtml(info.title)}" />
          <h2>${escapeHtml(info.title)}</h2>
          <p>${escapeHtml(info.description || "")}</p>
        `;

        // attach click listener immediately
        card.addEventListener("click", async () => {
          songs = await getSongs(`songs/${folder}`);
          if (songs && songs.length) playMusic(songs[0], true);
        });

        cardContainer.appendChild(card);

      } catch (innerErr) {
        console.error("Error handling anchor", a.href, innerErr);
      }
    }

    // helper: simple escape to avoid accidental HTML injection from info.json
    function escapeHtml(str = "") {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

  } catch (err) {
    console.error("displayAlbums failed:", err);
  }
}



async function main() {

    songs = await getSongs("songs/Himmat");

    playMusic(songs[0], true);

    displayAlbums();


    // PLAY / PAUSE BUTTON
    play.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play()
            play.src = "img/pause.svg"
        }
        else {
            currentSong.pause()
            play.src = "img/play.svg"
        }
    })

    // SPACEBAR PLAY/PAUSE
    document.addEventListener("keydown", (event) => {
        if (event.code === 'Space') {
            event.preventDefault();
            play.click();
        }
    });

  // Update the song list UI
        let list = document.querySelector(".songList ol");
        if (!list) {
            console.error("Song list element not found");
            return songs || [];
        }
    
    // TIME UPDATE
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songTime").innerHTML =
            `${secondsToMinutesSecond(currentSong.currentTime)}/${secondsToMinutesSecond(currentSong.duration)}`;
        document.querySelector(".circle").style.left =
            (currentSong.currentTime / currentSong.duration) * 100 + "%";
    });

    // NEXT
    next.addEventListener("click", () => {
        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
        if (index + 1 < songs.length) {
            playMusic(songs[index + 1]);
        }
    });

    // PREVIOUS
    previous.addEventListener("click", () => {
        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
        if (index - 1 >= 0) {
            playMusic(songs[index - 1]);
        }
    });

    // SEEK BAR CLICK
    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = (currentSong.duration) * (percent) / 100;
    });

    // HAMBURGER
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });

    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-110%";
    });

    // SLIDER VOLUME
    document.querySelector(".range input")
        .addEventListener("input", (e) => {
            currentSong.volume = parseInt(e.target.value) / 100;
        });


    // 🔊 ARROW UP / DOWN VOLUME
    document.addEventListener("keydown", (event) => {

        let step = 0.05;

        if (event.code === "ArrowUp") {
            event.preventDefault();
            currentSong.volume = Math.min(currentSong.volume + step, 1);
            document.querySelector(".range input").value = currentSong.volume * 100;
        }

        if (event.code === "ArrowDown") {
            event.preventDefault();
            currentSong.volume = Math.max(currentSong.volume - step, 0);
            document.querySelector(".range input").value = currentSong.volume * 100;
        }
    });

    // ⏩ SEEK FORWARD / REWIND USING ARROW KEYS
document.addEventListener("keydown", (event) => {

    // SEEK +5s → ArrowRight
    if (event.code === "ArrowRight") {
        event.preventDefault();
        if (!isNaN(currentSong.duration)) {
            currentSong.currentTime = Math.min(currentSong.currentTime + 5, currentSong.duration);
        }
    }

    // SEEK -5s → ArrowLeft
    if (event.code === "ArrowLeft") {
        event.preventDefault();
        if (!isNaN(currentSong.duration)) {
            currentSong.currentTime = Math.max(currentSong.currentTime - 5, 0);
        }
    }
});



    // 🔇 FIXED MUTE / UNMUTE WITH "M"
    document.addEventListener("keydown", (event) => {
        if (event.key.toLowerCase() === "m") {
            event.preventDefault();

            let volumeIcon = document.querySelector(".volume img");
            let volumeSlider = document.querySelector(".range input");

            if (currentSong.volume > 0) {
                currentSong.volume = 0;
                volumeSlider.value = 0;
                volumeIcon.src = "img/mute.svg";
            } else {
                currentSong.volume = 0.10; 
                volumeSlider.value = 10;
                volumeIcon.src = "img/volume.svg";
            }
        }
    });


    // FIXED CLICK MUTE ICON
    document.querySelector(".volume>img").addEventListener("click", e => {

        let volumeSlider = document.querySelector(".range input");

        if (e.target.src.includes("volume.svg")) {
            e.target.src = "img/mute.svg";
            currentSong.volume = 0;
            volumeSlider.value = 0;

        } else {
            e.target.src = "img/volume.svg";
            currentSong.volume = 0.10;
            volumeSlider.value = 10;
        }

    });

}


const playMusic = (track, pause = false) => {
    currentSong.src = `/${currFolder}/` + track;

    if (!pause) {
        currentSong.play();
        play.src = "img/pause.svg";
    }

    document.querySelector(".songInfo").innerHTML = decodeURI(track);
    document.querySelector(".songTime").innerHTML = "00:00 / 00:00";
};

main();
