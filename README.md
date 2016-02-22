kinto-client
============

[![Build Status](https://travis-ci.org/Kinto/kinto-client.svg?branch=master)](https://travis-ci.org/Kinto/kinto-client)

A JavaScript HTTP Client for the [Kinto](http://kinto-storage.org/) API.

Read the [API documentation](https://doc.esdoc.org/github.com/Kinto/kinto-client/).

Public CDN files:

- [kinto-client.js](https://npmcdn.com/kinto-client/dist/kinto-client.js)
- [kinto-client.min.js](https://npmcdn.com/kinto-client/dist/kinto-client.min.js)
- [kinto-client.noshim.js](https://npmcdn.com/kinto-client/dist/kinto-client.noshim.js)

## Usage

A client instance is created using the `KintoClient` constructor, passing it the remote Kinto server URL:

```js
const client = new KintoClient("https://kinto.dev.mozaws.net/v1/");
```

## Buckets

### Listing buckets

XXX To implement

```js
client.getBuckets();
```

### Creating a new bucket

```js
client.createBucket("blog");
```

### Selecting a bucket

```js
client.bucket("blog");
```

### Getting bucket permissions

```js
client.bucket("blog").getPermissions();
```

### Setting bucket permissions

Write permissions:

```js
client.bucket("blog").setPermissions("write", ["github:john", "github:bob"]);
```

Read permissions:

```js
client.bucket("blog").setPermissions("read", ["github:john", "github:bob"]);
```

### Listing bucket collections

```js
client.bucket("blog").getCollections();
```

### Creating a collection

XXX To implement

Named collection:

```js
client.bucket("blog").createCollection("posts");
```

With a name generated automatically:

```js
client.bucket("blog").createCollection();
```

### Updating a collection

XXX To implement

Named collection:

```js
client.bucket("blog").updateCollection("posts", {maxPerPage: 10});
```

## Collections

### Selecting a collection

```js
client.bucket("blog").collection("posts");
```

### Defining the [JSON schema](http://json-schema.org/) for a collection

```js
cons schema = {
  type: "object",
  required: ["title", "content"],
  properties: {
    title: {type: "string"},
    content: {type: "string"}
  }
};

client.bucket("blog").collection("posts").setSchema(schema);
```

### Retrieving collection schema

```js
client.bucket("blog").collection("posts").getSchema();
```

### Setting collection permissions

Write permissions:

```js
client.bucket("blog").collection("posts")
  .setPermissions("write", ["github:john", "github:bob"]);
```

Read permissions:

```js
client.bucket("blog").collection("posts")
  .setPermissions("read", ["github:john", "github:bob"]);
```

### Creating a new record

```js
client.bucket("blog").collection("posts")
  .createRecord({title: "My first post", content: "Hello World!"});
```

### Retrieving an existing record

XXX To implement

```js
client.bucket("blog").collection("posts")
  .getRecord("881e0707-f1b2-497b-99d0-b0d9aad49022");
```

### Updating an existing record

```js
client.bucket("blog").collection("posts")
  .updateRecord({
    id: "881e0707-f1b2-497b-99d0-b0d9aad49022",
    title: "My first post, edited",
    content: "Hello World, again!"
  });
```

### Deleting record

```js
client.bucket("blog").collection("posts")
  .deleteRecord("881e0707-f1b2-497b-99d0-b0d9aad49022");
```

### Listing records

```js
client.bucket("blog").collection("posts")
  .getRecords();
```

### Batching operations

This allows performing multiple operations in a single HTTP request.

```js
client.bucket("blog").collection("posts")
  .batch(batch => {
    batch.delete("881e0707-f1b2-497b-99d0-b0d9aad49022");
    batch.createRecord({title: "new post", content: "yo"});
    batch.createRecord({title: "another", content: "yo again"});
  });
```
