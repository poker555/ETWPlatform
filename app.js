const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const app = express();
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
      index: 'etw-events',
      body: {
        query: {
          match_all: {}
        },
        size: 100 // 示例：限制返回的文档数量为100
      }
    });

    // 处理查询结果
    const hits = result.body.hits.hits;

    // 准备传递给EJS模板的数据
    const data = hits.map(hit => hit._source);

    // 传递数据给EJS模板
    res.render("dashboard", { data });
  } catch (error) {
    console.error("Elasticsearch查询错误:", error);
    res.render("dashboard", {
      error: "Failed to retrieve logs.",
      data: [] // 确保在出错时传递一个空数组
    });
  }
});

app.get("/filesystemwatcher", async (req, res) => {
  try{
    const result = await client.search({
      index: 'file-system-events',
      body: {
        query: {
          match_all: {}
        }
      }
    });

    const hits = result.body.hits.hits;
    const data = hits.map(hit => hit._source);
    res.render("filesystemwatcher", { data });
    
  }catch(error){
    console.error("Elasticsearch查询错误:", error);
    res.render("filesystemwatcher", {
      error: "Failed to retrieve logs.",
      data: [] // 确保在出错时传递一个空数组
    });
  }
}


//port部分
const port = 1234;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});