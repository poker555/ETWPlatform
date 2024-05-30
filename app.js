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

const client = new Client({ node: "http://localhost:9200" });

app.get("/", async (req, res) => {
  try {
    const result = await client.search({
      
    });
    const hits = result.body.hits.hits;
    const data = hits.map(hit => hit._source);

    res.render("dashboard", { data });
  } catch (error) {
    console.error("Elasticsearch查询错误:", error);
    res.render("dashboard", {
      error: "Failed to retrieve logs.",
      data: [] // 确保在出错时传递一个空数组
    });
  }
});

app.get("/ProcessMonitor", async (req, res) => {
  const sortField = req.query.sortField === 'eventType' ? 'eventType.keyword' : (req.query.sortField || "timestamp");
  const sortOrder = req.query.sortOrder || "asc";
  try {
    const result = await client.search({
      index: 'etw-events',
      body: {
        sort: [
          {
            [sortField]: {
              order: sortOrder
            }
          }
        ],
        query: {
          match_all: {}
        },
        size: 100 // 示例：限制返回的文档数量为100
      }
    });

    const hits = result.body.hits.hits;
    const data = hits.map(hit => {
      const source = hit._source
      if (source.timestamp) {
        source.timestamp = moment(source.timestamp).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
      }


      return {
        processName: source.processName,
        processId: source.processId,
        commandLine: source.commandLine,
        timestamp: source.timestamp,
        eventType: source.eventType,
        md5: source.mD5,
        sha1: source.sHA1,
        sha256: source.sHA256
      };
    });
    

    // 传递数据给EJS模板
    res.render("ProcessMonitor", { data, sortField: req.query.sortField, sortOrder });
  } catch (error) {
    console.error("Elasticsearch查询错误:", error);
    res.render("ProcessMonitor", {
      error: "Failed to retrieve logs.",
      data: [], // 确保在出错时传递一个空数组
      sortField: req.query.sortField,
      sortOrder
    });
  }
});


app.get("/tcpip", async (req, res) => {
  const sortField = req.query.sortField || "timestamp";
  const sortOrder = req.query.sortOrder || "asc";
  try{
    const result = await client.search({
      index: 'tcpip-events',
      body: {
        sort: [
          {
            [sortField]: {
              order: sortOrder
            }
          }
        ],
        query: {
          match_all: {}
        },
        size: 100 // 示例：限制返回的文档数量为100
      }
    });

    const hits = result.body.hits.hits;
    const data = hits.map(hit => {
      const source = hit._source;
      if (source.timestamp) {
        source.timestamp = moment(source.timestamp).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
      }
      return source;
    
    });
    res.render("tcpip", { data,sortField: req.query.sortField, sortOrder});

  }catch(error){
    console.error("Elasticsearch查询错误:", error);
    res.render("tcpip", {
      error: "Failed to retrieve logs.",
      data: [], // 确保在出错时传递一个空数组
      sortField: req.query.sortField,
      sortOrder
    });
  }
});

app.get("/filesystemwatcher", async (req, res) => {
  const sortField = req.query.sortField === 'eventType' ? 'eventType.keyword' : (req.query.sortField || "timestamp");
  const sortOrder = req.query.sortOrder || "asc";
  try {
    const result = await client.search({
      index: 'file-system-events',
      body: {
        sort: [
          {
            [sortField]: {
              order: sortOrder
            }
          }
        ],
        query: {
          match_all: {}
        },
        size: 100 // 示例：限制返回的文档数量为100
      }
    });

    const hits = result.body.hits.hits;
    const data = hits.map(hit => {
      const source = hit._source
      if (source.timestamp) {
        source.timestamp = moment(source.timestamp).tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss');
      }
      return source;
    
    });
    res.render("filesystemwatcher", { data, sortField: req.query.sortField, sortOrder });
  } catch (error) {
    console.error("Elasticsearch查询错误:", error);
    res.render("filesystemwatcher", {
      error: "Failed to retrieve logs.",
      data: [], // 确保在出错时传递一个空数组
      sortField: req.query.sortField,
      sortOrder
    });
  }
});



//port部分
const port = 1234;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});