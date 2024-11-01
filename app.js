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
    password: "2xX02HZSSkjCVsY=MRw5"  // 替換為你的密碼
  }
});

app.get("/", async (req, res) => {
  try {
    // 查詢 processStart 索引的統計數量
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

    // 查詢 processStop 索引的統計數量
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

    // 查詢 tcpip 總數
    const tcpipCount = await client.count({
      index: 'tcpip'
    });

    // 查詢 isBlacklisted 為 true 的 TCPIP 資料的數量
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

    // 將統計數據傳遞給 dashboard 模板
    const processStartTotal = processStartCount.body.count;
    const processStopTotal = processStopCount.body.count;
    const tcpipTotal = tcpipCount.body.count;
    const tcpipBlacklistedTotal = tcpipBlacklistedCount.body.count;

    res.render("dashboard", {
      processStartTotal,
      processStopTotal,
      tcpipTotal,
      tcpipBlacklistedTotal
    });
  } catch (error) {
    console.error("Elasticsearch 查詢錯誤:", error);
    res.render("dashboard", {
      error: "無法檢索統計數據。",
      processStartTotal: 0,
      processStopTotal: 0,
      tcpipTotal: 0,
      tcpipBlacklistedTotal: 0
    });
  }
});


app.get("/ProcessMonitor", async (req, res) => {
  try {
    const result = await client.search({
      index: 'process',
      body: {
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
      index: 'filesystem', // 替換為你的索引名稱
      body: {
        query: { match_all: {} },
        size: 100
      }
    });

    const hits = result.body.hits.hits;
    const data = hits.map(hit => ({
      Type: hit._source.Type || 'N/A',
      Path: hit._source.Path || 'N/A',
      CreateTime: hit._source.CreateTime || 'N/A'
    }));

    res.render("FileSystemWatcher", { data });
  } catch (error) {
    console.error("Elasticsearch 查詢錯誤:", error);
    res.render("FileSystemWatcher", {
      error: "無法檢索日誌。",
      data: []
    });
  }
});

//port部分
const port = 1234;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});