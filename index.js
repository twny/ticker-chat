// Global variables
let totalMessages = 0,
  messagesLimit = 0,
  noname = "show",
  nickColor = "user",
  customNickColor,
  channelName,
  provider,
  animationIn = "bounceIn",
  animationOut = "bounceOut",
  hideAfter = 60,
  hideCommands = "no",
  ignoredUsers = [],
  previousSender = "",
  emotes = [];

// Handle event reception
window.addEventListener("onEventReceived", function (obj) {
  if (obj.detail.listener === "delete-message") {
    handleDeleteMessage(obj.detail.event.msgId);
  } else if (obj.detail.listener === "delete-messages") {
    handleDeleteMessages(obj.detail.event.userId);
  } else if (obj.detail.listener === "message") {
    handleMessage(obj.detail.event.data);
  }
});

// Handle widget load
window.addEventListener("onWidgetLoad", handleWidgetLoad);

/**
 * Delete a single message
 * @param {string} msgId
 */
function handleDeleteMessage(msgId) {
  $(`.message-row[data-msgid=${msgId}]`).remove();
}

/**
 * Delete all messages from a user
 * @param {string} userId
 */
function handleDeleteMessages(userId) {
  $(`.message-row[data-sender=${userId}]`).remove();
}

/**
 * Handle a chat message
 * @param {object} data
 */
function handleMessage(data) {
  if (data.text.startsWith("!") && hideCommands === "yes") return;
  if (ignoredUsers.indexOf(data.nick) !== -1) return;

  let message = replaceEmotesWithImages(data.text, data.emotes);
  let badges = createBadgesHTML(data);
  let username = formatUsername(data);

  addMessage(
    data.displayName,
    username,
    badges,
    message,
    data.isAction,
    data.userId,
    data.msgId
  );
}

/**
 * Handle widget load event
 * @param {object} obj
 */
async function handleWidgetLoad(obj) {
  const fieldData = obj.detail.fieldData;
  animationIn = fieldData.animationIn;
  animationOut = fieldData.animationOut;
  hideAfter = fieldData.hideAfter;
  messagesLimit = fieldData.messagesLimit;
  nickColor = fieldData.nickColor;
  customNickColor = fieldData.customNickColor;
  hideCommands = fieldData.hideCommands;
  channelName = obj.detail.channel.username;
  noname = fieldData.noname;

  if (fieldData.ignoredUsers) {
    ignoredUsers = fieldData.ignoredUsers
      .toLowerCase()
      .replace(" ", "")
      .split(",");
  }

  const res = await fetch(
    `https://api.streamelements.com/kappa/v2/channels/${obj.detail.channel.id}/`
  );
  const resJson = await res.json();
  provder = resJson.provider;
}

/**
 * Create badges HTML
 * @param {object} data
 * @returns {string}
 */
function createBadgesHTML(data) {
  let badges = "";
  if (provider === "mixer") {
    data.badges.push({ url: data.avatar });
  }
  for (let i = 0; i < data.badges.length; i++) {
    let badge = data.badges[i];
    badges += `<img alt="" src="${badge.url}" class="badge"> `;
  }
  return badges;
}

/**
 * Format username with color
 * @param {object} data
 * @returns {string}
 */
function formatUsername(data) {
  let username = data.displayName + ":";
  if (nickColor === "user") {
    const color =
      data.displayColor !== ""
        ? data.displayColor
        : "#" + md5(username).substr(26);
    username = `<span style="color:${color}">${username}</span>`;
  }
  if (nickColor === "custom") {
    const color = customNickColor;
    username = `<span style="color:${color}">${username}</span>`;
  }
  return username;
}

/**
 * Add message to the chat
 * @param {string} nickname
 * @param {string} username
 * @param {string} badges
 * @param {string} message
 * @param {boolean} isAction
 * @param {string} userId
 * @param {string} msgId
 */
function addMessage(
  nickname,
  username,
  badges,
  message,
  isAction,
  userId,
  msgId
) {
  if (noname === "show") {
    if (previousSender !== username) {
      previousSender = username;
    } else {
      username = "";
      badges = "";
    }
  }

  totalMessages += 1;
  let actionClass = isAction ? "action" : "";
  const element = $.parseHTML(`
    <div data-sender="${userId}" data-msgid="${msgId}" class="message-row animated" id="msg-${totalMessages}">
        <div class="user-box ${actionClass}">${badges}${username}</div>
        <div class="user-message ${actionClass}">${message}</div>
    </div>`);

  if (hideAfter !== 999) {
    animateMessage(element, totalMessages);
  } else {
    $(".main-container").prepend(element);
    gsap.fromTo(
      `#msg-${totalMessages}`,
      0.5,
      { width: 0 },
      { ease: Power1.easeOut, width: "auto" }
    );
  }

  removeOldMessages();
}

/**
 * Animate message
 * @param {object} element
 * @param {number} messageIndex
 */
function animateMessage(element, messageIndex) {
  $(".main-container").prepend(element);
  gsap.fromTo(
    `#msg-${messageIndex}`,
    0.5,
    { width: 0 },
    { ease: Power1.easeOut, width: "auto" }
  );

  $(".main-container .message-row")
    .prepend(element)
    .delay(hideAfter * 1000)
    .queue(function () {
      $(this)
        .removeClass(animationIn)
        .addClass(animationOut)
        .delay(1000)
        .queue(function () {
          $(this).remove();
        })
        .dequeue();
    });
}

/**
 * Remove old messages if limit is reached
 */
function removeOldMessages() {
  document.querySelectorAll(".main-container .message-row").forEach((el, i) => {
    if (i >= messagesLimit) {
      gsap
        .timeline()
        .to(el, { opacity: 0 })
        .add(() => {
          el.remove();
        });
    }
  });
}

/**
 * Replace emotes in text with images
 * @param {string} text
 * @param {array} emotes
 * @returns {string}
 */
function replaceEmotesWithImages(text, emotes) {
  if (!text || (Array.isArray(emotes) && !emotes.length)) return text;

  let message = text;

  for (const emote of emotes) {
    const emotesKeys = Object.keys(emote.urls);
    // get the latest version
    const latestVersion = emotesKeys.pop();

    const emoteImg = `<img src='${emote.urls[latestVersion]}' class='emote'/>`;
    message = message.replaceAll(emote.name, emoteImg);
  }

  return message;
}
