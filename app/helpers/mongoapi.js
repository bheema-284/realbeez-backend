// https://www.mongodb.com/docs/atlas/app-services/data-api/examples/

const mongoUrl = process.env.MONGODB_URI;
const apiKey = process.env.MONGODB_DATA_API_KEY;
const dataSource = process.env.MONGODB_DATA_API_DATASOURCE;
const dbName = process.env.MONGODB_DBNAME;

if (!mongoUrl || !apiKey || !dataSource || !dbName) {
  throw new Error("Missing required environment variables");
}

const headerData = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "Access-Control-Request-Headers": "*",
  "api-key": apiKey,
};

export async function MongoApiFindOne(collection, query, options) {
  let result = {
    status: false,
    mode: "find",
    data: "",
    id: "",
    message: "",
  };

  const dataBody = {
    collection: collection,
    database: dbName,
    dataSource: dataSource,
    filter: query,
  };
  if (options?.projection) {
    dataBody["projection"] = options.projection;
  }
  const bodyData = JSON.stringify(dataBody);

  const res = await fetch(mongoUrl + "findOne", {
    headers: headerData,
    body: bodyData,
    method: "POST",
  });
  if (!res.ok) {
    result.message = await res.json();
    return result;
  }
  let data = await res.json();
  if (data.document) {
    result.status = true;
    result.data = data.document;
    result.id = 1;
  } else {
    result.status = false;
    result.message = "No document found";
  }
  return result;
}

export async function MongoApiFind(collection, query, options = {}) {
  //projection, sort, limit
  let result = {
    status: false,
    mode: "",
    data: "",
    id: "",
    message: "",
  };

  const bodyData = JSON.stringify({
    collection: collection,
    database: dbName,
    dataSource: dataSource,
    filter: query,
    ...options,
  });
  const res = await fetch(mongoUrl + "find", {
    headers: headerData,
    body: bodyData,
    method: "POST",
  });
  if (!res.ok) {
    result.message = await res.json();
    return result;
  }
  let data = await res.json();
  if (data.documents) {
    result.status = true;
    result.data = data.documents;
    result.id = 1;
  } else {
    result.status = false;
    result.message = "No document found";
  }
  return result;
}

export async function MongoApiUpdateOne(collection, query, options = {}) {
  if (Object.keys(options).length === 0)
    throw new Error("options cannot be empty for updateOne");
  if (Object.keys(query).length === 0)
    throw new Error("query cannot be empty for updateOne");

  let result = {
    status: false,
    mode: "update",
    data: 0,
    id: 0,
    message: "",
  };

  const bodyData = JSON.stringify({
    collection: collection,
    database: dbName,
    dataSource: dataSource,
    filter: query,
    update: options,
  });

  const res = await fetch(mongoUrl + "updateOne", {
    headers: headerData,
    body: bodyData,
    method: "POST",
  });
  if (!res.ok) {
    result.message = await res.json();
    return result;
  }
  let data = await res.json();
  if (data.matchedCount) {
    result.status = true;
    result.data = data.modifiedCount;
    result.id = data.modifiedCount;
  } else {
    result.message = "Document not be found to update";
  }

  return result;
}

export async function MongoApiInsertOne(collection, insertDoc) {
  if (Object.keys(insertDoc).length === 0)
    throw new Error("options cannot be empty for updateOne");
  let result = {
    status: false,
    mode: "",
    data: "",
    id: "",
    message: "",
  };

  const bodyData = JSON.stringify({
    collection: collection,
    database: dbName,
    dataSource: dataSource,
    document: insertDoc,
  });
  const res = await fetch(mongoUrl + "insertOne", {
    headers: headerData,
    body: bodyData,
    method: "POST",
  });
  if (!res.ok) {
    result.message = await res.json();
    return result;
  }
  let data = await res.json();
  if (data.insertedId) {
    result.status = true;
    result.data = data.insertedId;
    result.id = data.insertedId;
  } else {
    result.status = false;
    result.message = "Document couldn't be inserted";
  }
  return result;
}
