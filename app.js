const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const app = express();
const moment = require('moment-timezone');
require("dotenv").config();
const { Client } = require("@elastic/elasticsearch");

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "mySecretKey",
    resave: true,
    saveUninitialized: true,
  })
);

const client = new Client({ 
  node: "http://localhost:9200",
  auth: {
    username: "elastic", // 替換為你的帳號
    password: "ZYi7WcxwMyvQXg0IyMBj"  // 替換為你的密碼
  }
});

app.get("/", async (req, res) => {
  try {
    // 原有的 Process 和 TCPIP 統計查詢...
    const processStartCount = await client.count({
      index: 'process',
      body: {
        query: {
          match: {
            processType: 'ProcessStart'
          }
        }
      }
    });

    const processStopCount = await client.count({
      index: 'process',
      body: {
        query: {
          match: {
            processType: 'ProcessStop'
          }
        }
      }
    });

    const tcpipCount = await client.count({
      index: 'tcpip'
    });

    const tcpipBlacklistedCount = await client.count({
      index: 'tcpip',
      body: {
        query: {
          term: {
            isBlacklisted: true
          }
        }
      }
    });

    // 新增：檔案事件類型統計
    const fileChangeCount = await client.count({
      index: 'file_watcher',
      body: {
        query: {
          match: {
            type: 'Change'
          }
        }
      }
    });

    const fileCreateCount = await client.count({
      index: 'file_watcher',
      body: {
        query: {
          match: {
            type: 'Create'
          }
        }
      }
    });

    const fileDeleteCount = await client.count({
      index: 'file_watcher',
      body: {
        query: {
          match: {
            type: 'Delete'
          }
        }
      }
    });

    const fileRenameCount = await client.count({
      index: 'file_watcher',
      body: {
        query: {
          match: {
            type: 'Rename'
          }
        }
      }
    });

    // 計算檔案事件總數
    const fileTotalCount = await client.count({
      index: 'file_watcher'
    });

    // 將所有統計數據傳遞給模板
    res.render("dashboard", {
      processStartTotal: processStartCount.body.count,
      processStopTotal: processStopCount.body.count,
      tcpipTotal: tcpipCount.body.count,
      tcpipBlacklistedTotal: tcpipBlacklistedCount.body.count ?? 0,
      fileTotal: fileTotalCount.body.count,
      fileChangeTotal: fileChangeCount.body.count,
      fileCreateTotal: fileCreateCount.body.count,
      fileDeleteTotal: fileDeleteCount.body.count,
      fileRenameTotal: fileRenameCount.body.count
    });
  } catch (error) {
    console.error("Elasticsearch 查詢錯誤:", error);
    res.render("dashboard", {
      error: "無法檢索統計數據。",
      processStartTotal: 0,
      processStopTotal: 0,
      tcpipTotal: 0,
      tcpipBlacklistedTotal: 0,
      fileTotal: 0,
      fileChangeTotal: 0,
      fileCreateTotal: 0,
      fileDeleteTotal: 0
    });
  }
});


app.get("/ProcessMonitor", async (req, res) => {
  try {
    const result = await client.search({
      index: 'process',
      body: {
        sort: [{ createTime: { order: "desc" } }],  // 添加默認排序
        query: { match_all: {} },
        size: 100
      }
    });

    const hits = result.body.hits.hits;
    const data = hits.map(hit => ({
      processName: hit._source.processName || 'N/A',
      processID: hit._source.processID || 'N/A',
      commandLine: hit._source.commandLine || 'N/A',
      md5: hit._source.mD5 || null,
      sha1: hit._source.sHA1 || null,
      sha256: hit._source.sHA256 || null,
      timestamp: hit._source.createTime || 'N/A',
      eventType: hit._source.processType || 'N/A'
    }));

    res.render("ProcessMonitor", { data });
  } catch (error) {
    console.error("Elasticsearch查詢錯誤:", error);
    res.render("ProcessMonitor", {
      error: "無法檢索日誌。",
      data: []
    });
  }
});



app.get("/tcpip", async (req, res) => {
  try {
    // 獲取所有 TCPIP 資料並按照 createTime 排序
    const allResults = await client.search({
      index: 'tcpip',
      body: {
        sort: [{ createTime: { order: "desc" } }],
        query: { match_all: {} },
        size: 100
      }
    });

    // 獲取 isBlacklisted 為 true 的資料
    const blacklistedResults = await client.search({
      index: 'tcpip',
      body: {
        sort: [{ createTime: { order: "desc" } }],
        query: {
          term: {
            isBlacklisted: true
          }
        },
        size: 100
      }
    });

    const allData = allResults.body.hits.hits.map(hit => ({
      tCPIPEvent: hit._source.tCPIPEvent,
      sourceIP: hit._source.sourceIP,
      destIP: hit._source.destIP,
      processID: hit._source.processID,
      createTime: hit._source.createTime,
      isBlacklisted: hit._source.isBlacklisted || false
    }));

    const blacklistedData = blacklistedResults.body.hits.hits.map(hit => ({
      tCPIPEvent: hit._source.tCPIPEvent,
      sourceIP: hit._source.sourceIP,
      destIP: hit._source.destIP,
      processID: hit._source.processID,
      createTime: hit._source.createTime,
      isBlacklisted: hit._source.isBlacklisted || false
    }));

    res.render("tcpip", { allData, blacklistedData });
  } catch (error) {
    console.error("Elasticsearch查詢錯誤:", error);
    res.render("tcpip", {
      error: "無法檢索日誌。",
      allData: [],
      blacklistedData: []
    });
  }
});


app.get("/filesystemwatcher", async (req, res) => {
  try {
    const result = await client.search({
      index: 'file_watcher',
      body: {
        sort: [{ createTime: { order: "desc" } }],
        query: { match_all: {} },
        size: 100
      }
    });

    const hits = result.body.hits.hits;
    const data = hits.map(hit => ({
      type: hit._source.type || 'N/A',
      path: hit._source.path || 'N/A',
      createTime: moment(hit._source.createTime).format('YYYY-MM-DD HH:mm:ss') || 'N/A'
    }));

    res.render("FileSystemWatcher", { data });
  } catch (error) {
    console.error("Elasticsearch查詢錯誤:", error);
    res.render("FileSystemWatcher", {
      error: "無法檢索日誌。",
      data: []
    });
  }
});
//test

//port部分
const port = 4500;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});