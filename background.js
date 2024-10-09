browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.removeAll();
    setupContextMenus();
});


function setupContextMenus() {
    browser.contextMenus.create({
        id: "link-button",
        title: browser.i18n.getMessage("contextMenuItemSaveAs"),
        contexts: ["link"],
    });
    browser.contextMenus.create({
        id: "edit-tailcut",
        title: browser.i18n.getMessage("contextMenuItemCutTail"),
        contexts: ["page"],
    });
    browser.contextMenus.create({
        id: "edit-headcut",
        title: browser.i18n.getMessage("contextMenuItemCutHead"),
        contexts: ["page"],
    });
}

const MessageKind = {
    saveAs: "save-as",
    editTailCutNum: "edit-tailcut-num",
    editHeadCutNum: "edit-headcut-num",
};


browser.contextMenus.onClicked.addListener(async function (info, tab) {
    if (info.menuItemId === "link-button") {
        var fileName = await generateFileName(info.linkUrl, tab.title)
        if (fileName === "") {
            browser.tabs.executeScript(tab.id, {
                code: `
                    alert("${browser.i18n.getMessage("dialogMessageFileNameIsEmpty")}");
                `
            });
            return;
        }

        saveAs(info.linkUrl, fileName);
    } else if (info.menuItemId === "edit-tailcut") {
        var tailcut = await getTailCutOr0();
        browser.tabs.executeScript(tab.id, {
            code: `
                var tailcut_num = prompt("${browser.i18n.getMessage("dialogMessageEditTailCutNum")}", ${tailcut});
                if (tailcut_num) {
                    browser.runtime.sendMessage({ kind: "${MessageKind.editTailCutNum}", tailcutNum: tailcut_num });
                }
            `
        });
    } else if (info.menuItemId === "edit-headcut") {
        var headcut = await getHeadCutOr0();
        browser.tabs.executeScript(tab.id, {
            code: `
                var headcut_num = prompt("${browser.i18n.getMessage("dialogMessageEditHeadCutNum")}", ${headcut});
                if (headcut_num) {
                    browser.runtime.sendMessage({ kind: "${MessageKind.editHeadCutNum}", headcutNum: headcut_num });
                }
            `
        });
    }
});


/**
 * リンク先の保存に使われるファイル名を決定する。
 * 
 * 基本的には、
 * 
 * 1. リンク先のファイル名がない場合（リンク先URLが`/`で終わる場合）は、ページタイトルが使用される。
 * 2. そうでないときは、  
 *      a. 拡張子があるときは、ページタイトル+リンク先URLの末尾拡張子をファイル名とする。  
 *      b. 拡張子がないときは、ページタイトルそのものをファイル名とする。
 * 
 * ページタイトルは、設定された値の数だけ文字列の前後のtrimを行う。trimの設定値によっては空文字も返る。
 * @param {string} linkUrl リンク先URL
 * @param {string} pageTitle 基本的には使われることになるページタイトル
 * @returns ダウンロードに使用されることになるファイル名
 */
async function generateFileName(linkUrl, pageTitle) {
    var originalFileName = linkUrl.split("/").pop();
    // パラメータをカット
    originalFileName = originalFileName.split("?")[0];
    // アンカーをカット
    originalFileName = originalFileName.split("#")[0];
    // 拡張子がないときは、originalFileNameと同じになる
    var ext = originalFileName.split(".").pop();

    var tailcut = await getTailCutOr0();
    var headcut = await getHeadCutOr0();
    pageTitle = pageTitle.slice(headcut, pageTitle.length - tailcut);
    if (pageTitle.length < tailcut + headcut) {
        // 負数による意図していない文字列を排除する
        pageTitle = "";
    }
    // ファイル名から不正な文字を削除
    var fileName = purifyString(pageTitle)

    if (originalFileName === "" || fileName.length < 1) {
        return fileName;
    }
    if (ext === originalFileName) {
        // 拡張子がないとき
        return fileName;
    } else {
        // 拡張子があるとき
        return fileName + "." + ext;
    }
}


/**
 * ファイル名として使えない文字を_に置換する
 * @param {string} text 
 * @returns 
 */
function purifyString(text) {
    return text.replace(/[<>:"\/\\|?*\x00-\x1F]/g, "_").replace(/[\x7F-\x9F]/g, "_");
}

/**
 * 非負整数の文字列ならば、numberに変換する。
 * @param {string} value target number string
 * @returns value converted to non negative number, or 0
 */
function checkIsIntegerOr0(value) {
    // 整数かどうかをチェック
    var v = Number(value);
    if (Number.isInteger(v) && v >= 0) {
        return v;
    } else {
        return 0;
    }
}


browser.runtime.onMessage.addListener(async function (message) {
    if (message.kind === MessageKind.saveAs) {
        saveAs(message.linkUrl, message.fileName);
    } else if (message.kind === MessageKind.editTailCutNum) {
        editTailCut(sanitizeNumber(message.tailcutNum));
    } else if (message.kind === MessageKind.editHeadCutNum) {
        editHeadCut(sanitizeNumber(message.headcutNum));
    }
});


function sanitizeNumber(numberStr) {
    return numberStr.replace(/\D/g, "");
}


async function saveAs(linkUrl, fileName) {
    try {
        var _download_item_id = await browser.downloads.download({
            url: linkUrl,
            filename: fileName,
            saveAs: true
        });
    } catch (err) {
        console.log("error", err);
    }
}

function editTailCut(newValue) {
    browser.storage.local.set({ tailcutNum: newValue }, function () {
        console.log('tailcut number was saved:', newValue);
    });
}

async function getTailCutOr0() {
    var tailcut = 0;
    try {
        var configTailcut = await browser.storage.local.get("tailcutNum");
        tailcut = checkIsIntegerOr0(configTailcut.tailcutNum);
    } catch (err) {
        console.log("failed to get tailcut number, use 0", err);
    }
    console.log("retrieve tailcut", tailcut);
    return tailcut;
}


function editHeadCut(newValue) {
    browser.storage.local.set({ headcutNum: newValue }, function () {
        console.log('headcut number was saved:', newValue);
    });
}

async function getHeadCutOr0() {
    var headcut = 0;
    try {
        var configHeadcut = await browser.storage.local.get("headcutNum");
        headcut = checkIsIntegerOr0(configHeadcut.headcutNum);
    } catch (err) {
        console.log("failed to get headcut number, use 0", err);
    }
    console.log("retrieve headcut", headcut);
    return headcut;
}
