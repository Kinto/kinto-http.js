kinto-client
============

[![Build Status](https://travis-ci.org/Kinto/kinto-client.svg?branch=master)](https://travis-ci.org/Kinto/kinto-client)

A JavaScript HTTP Client for the [Kinto](http://kinto-storage.org/) API.

Read the [API documentation](https://doc.esdoc.org/github.com/Kinto/kinto-client/).

## Table of Contents

  - [Installation](#installation)
  - [Usage](#usage)
  - [Buckets](#buckets)
     - [Listing buckets](#listing-buckets)
     - [Creating a new bucket](#creating-a-new-bucket)
     - [Selecting a bucket](#selecting-a-bucket)
     - [Setting bucket data](#setting-bucket-data)
     - [Getting bucket permissions](#getting-bucket-permissions)
     - [Setting bucket permissions](#setting-bucket-permissions)
     - [Deleting a bucket](#deleting-a-bucket)
     - [Creating a collection](#creating-a-collection)
     - [Listing bucket collections](#listing-bucket-collections)
     - [Deleting a collection](#deleting-a-collection)
  - [Collections](#collections)
     - [Selecting a collection](#selecting-a-collection)
     - [Setting the JSON schema for a collection](#setting-the-json-schema-for-a-collection)
     - [Retrieving the collection schema](#retrieving-the-collection-schema)
     - [Setting collection permissions](#setting-collection-permissions)
     - [Setting collection metadata](#setting-collection-metadata)
     - [Getting collection metadata](#getting-collection-metadata)
     - [Creating a new record](#creating-a-new-record)
     - [Retrieving an existing record](#retrieving-an-existing-record)
     - [Updating an existing record](#updating-an-existing-record)
     - [Deleting record](#deleting-record)
     - [Listing records](#listing-records)
     - [Batching operations](#batching-operations)
  - [Options](#options)
  - [The safe option explained](#the-safe-option-explained)
     - [Safe creations](#safe-creations)
     - [Safe updates](#safe-updates)
     - [Safe deletions](#safe-deletions)

---

## Installation

In the browser, you can load prebuilt scripts hosted on npmcdn:

- [kinto-client.js](https://npmcdn.com/kinto-client/dist/kinto-client.js)
- [kinto-client.min.js](https://npmcdn.com/kinto-client/dist/kinto-client.min.js)
- [kinto-client.noshim.js](https://npmcdn.com/kinto-client/dist/kinto-client.noshim.js)

```html
<script src="https://npmcdn.com/kinto-client/dist/kinto-client.min.js"></script>
```

In nodejs:

```
$ npm install kinto-client --save
```

Then (ES6):

```js
import KintoClient from "kinto-client";
```

Or (ES5):

```js
var KintoClient = require("kinto-client").default;
```

Note that this HTTP client can be transparently used server side or in a regular browser page.

## Usage

A client instance is created using the `KintoClient` constructor, passing it the remote Kinto server root URL, including the version:

```js
const client = new KintoClient("https://kinto.dev.mozaws.net/v1");
```

#### Options

- `safe`: Adds concurrency headers to every requests. (default: `true`)
- `events`: The events handler. If none provided an `EventEmitter` instance will be created.
- `headers`: The key-value headers to pass to each request. (default: `{}`)
- `bucket`: The default bucket to use. (default: `"default"`)
- `requestMode`: The HTTP [CORS](https://fetch.spec.whatwg.org/#concept-request-mode) mode. (default: `"cors"`)
- `timeout`: The requests timeout in milliseconds. (default: `5000`)


## Authentication

Authenticating against a Kinto server can be achieved by adding an `Authorization` header to the request.

By default Kinto server supports Basic Auth authentication, but others mechanisms can be activated such as OAuth (eg. [Firefox Account](https://accounts.firefox.com/))

### Using Basic Auth

Simply provide an `Authorization` header option to the `Kinto` constructor:

```js
const secretString = `${username}:${password}`;
const kinto = new KintoClient("https://my.server.tld/v1", {
  headers: {
    Authorization: "Basic " + btoa(secretString)
  }
});
```

> #### Notes
>
> - As explained in the [server docs](http://kinto.readthedocs.io/en/stable/api/1.x/authentication.html#basic-auth), any string is accepted. You're not obliged to use the `username:password` format.

### Using an OAuth Bearer Token

As for Basic Auth, once you have retrieved a valid OAuth Bearer Token, simply pass it in an `Authorization` header:

```js
const kinto = new KintoClient("https://my.server.tld/v1", {
  headers: {
    Authorization: `Bearer ` + oauthBearerToken)
  }
});
```


## Buckets

### Listing buckets

```js
client.listBuckets([options])
  .then(({data}) => ...);
```

Sample result:

```js
{
  data: [
    {
      id: "comments",
      last_modified: 1456182233221,
    },
    {
      id: "blog",
      last_modified: 1456181213214,
    },
  ]
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request

### Creating a new bucket

```js
client.createBucket("blog"[, options])
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "last_modified": 1456182233221,
    "id": "foo"
  },
  "permissions": {
    "write": [
      "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8"
    ]
  }
}
```

#### Options

- `data`: Arbitrary data to attach to the bucket
- `headers`: Custom headers object to send along the HTTP request
- `safe`: Whether to override existing resource if it already exists (default: `false`)

### Selecting a bucket

```js
client.bucket("blog");
```

### Setting bucket data

```js
client.bucket("blog").setData({foo: "bar"})
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "last_modified": 1456182336242,
    "id": "blog",
    "foo": "bar"
  },
  "permissions": {
    "write": [
      "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8"
    ]
  }
}
```

#### Options

- `patch`: Patches existing bucket data instead of replacing them (default: `false`)
- `headers`: Custom headers object to send along the HTTP request
- `safe`: Whether to override existing resource if it already exists (default: `false`)

### Getting bucket permissions

```js
client.bucket("blog").getPermissions()
  .then(result => ...);
```

Sample result:

```js
{
  "write": [
    "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8"
  ]
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request

### Setting bucket permissions

```js
const permissions = {
  read:  ["github:bob"],
  write: ["github:bob", "github:john"]
};

client.bucket("blog").setPermissions(permissions[, options])
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "last_modified": 1456182888466,
    "id": "blog"
  },
  "permissions": {
    "read": ["github:bob"],
    "write": [
      "github:bob",
      "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8",
      "github:john"
    ]
  }
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request;
- `safe`: If `last_modified` is provided, ensures the resource hasn't been modified since that timestamp. Otherwise ensures no existing resource with the provided id will be overriden (default: `false`);
- `last_modified`: The last timestamp we know the resource has been updated on the server.

#### Notes

- This operation replaces any previously set permissions;
- Owners will always keep their `write` permission bit, as per the Kinto protocol.

### Deleting a bucket

```js
client.deleteBucket("testbucket"[, options])
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "deleted": true,
    "last_modified": 1456182931974,
    "id": "blog"
  }
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request;
- `safe`: Ensures the resource hasn't been modified in the meanwhile if `last_modified` is provided (default: `false`);
- `last_modified`: The last timestamp we know the resource has been updated on the server.

### Creating a collection

#### Named collection

```js
client.bucket("blog").createCollection("posts")
  .then(result => ...);
```

Sample result:

```js

{
  "data": {
    "last_modified": 1456183004372,
    "id": "posts"
  },
  "permissions": {
    "write": [
      "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8"
    ]
  }
}
```

#### With a name generated automatically

```js
client.bucket("blog").createCollection()
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "last_modified": 1456183040592,
    "id": "OUh5VEDa"
  },
  "permissions": {
    "write": [
      "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8"
    ]
  }
}
```

Note that `OUh5VEDa` is the collection ID automatically generated by the server.

#### Options

- `headers`: Custom headers object to send along the HTTP request
- `safe`: Whether to override existing resource if it already exists (default: `false`)

### Listing bucket collections

```js
client.bucket("blog").listCollections()
  .then(({data}) => ...);
```

Sample result:

```js
{
  data: [
    {
      "last_modified": 1456183153840,
      "id": "posts"
    },
    {
      "last_modified": 1456183159386,
      "id": "comments"
    }
  ]
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request

### Deleting a collection

```js
client.bucket("blog").deleteCollection("test")
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "deleted": true,
    "last_modified": 1456183116571,
    "id": "posts"
  }
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request;
- `safe`: Ensures the resource hasn't been modified in the meanwhile if `last_modified` is provided (default: `false`);
- `last_modified`: The last timestamp we know the resource has been updated on the server.

## Collections

### Selecting a collection

```js
client.bucket("blog").collection("posts")
  .then(result => ...);
```

### Setting the [JSON schema](http://json-schema.org/) for a collection

```js
const schema = {
  type: "object",
  required: ["title", "content"],
  properties: {
    title: {type: "string"},
    content: {type: "string"}
  }
};

client.bucket("blog").collection("posts").setSchema(schema)
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "last_modified": 1456183376428,
    "id": "posts",
    "schema": {
      "required": [
        "title",
        "content"
      ],
      "type": "object",
      "properties": {
        "content": {
          "type": "string"
        },
        "title": {
          "type": "string"
        }
      }
    }
  },
  "permissions": {
    "write": [
      "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8"
    ]
  }
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request;
- `safe`: If `last_modified` is provided, ensures the resource hasn't been modified since that timestamp. Otherwise ensures no existing resource with the provided id will be overriden (default: `false`);
- `last_modified`: The last timestamp we know the resource has been updated on the server.

### Retrieving the collection schema

```js
client.bucket("blog").collection("posts").getSchema()
  .then(result => ...);
```

Sample result:

```js
{
  "required": [
    "title",
    "content"
  ],
  "type": "object",
  "properties": {
    "content": {
      "type": "string"
    },
    "title": {
      "type": "string"
    }
  }
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request;

### Setting collection permissions

```js
client.bucket("blog").collection("posts")
  .setPermissions({
    read: ["github:bob"],
    write: ["github:john", "github:bob"]
  })
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "last_modified": 1456183508926,
    "id": "posts"
  },
  "permissions": {
    "read": ["github:bob"],
    "write": [
      "github:bob",
      "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8",
      "github:john"
    ]
  }
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request;
- `safe`: If `last_modified` is provided, ensures the resource hasn't been modified since that timestamp. Otherwise ensures no existing resource with the provided id will be overriden (default: `false`);
- `last_modified`: The last timestamp we know the resource has been updated on the server.

#### Notes

- This operation replaces any previously set permissions;
- Owners will always keep their `write` permission bit, as per the Kinto protocol.

### Setting collection metadata

```js
client.bucket("blog").collection("posts")
  .setMetadata({preferedAuthor: "@chucknorris"})
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "last_modified": 1456183561206,
    "id": "posts",
    "preferedAuthor": "@chucknorris"
  },
  "permissions": {
    "write": [
      "github:bob",
      "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8",
      "github:john"
    ]
  }
}
```

#### Options

- `patch`: Patches the existing data instead of replacing them (default: `false`)
- `headers`: Custom headers object to send along the HTTP request;
- `safe`: If `last_modified` is provided, ensures the resource hasn't been modified since that timestamp. Otherwise ensures no existing resource with the provided id will be overriden (default: `false`);
- `last_modified`: The last timestamp we know the resource has been updated on the server.

### Getting collection metadata

```js
client.bucket("blog").collection("posts").getMetadata()
  .then(result => ...);
```

Sample result:

```js
{
  "last_modified": 1456183561206,
  "id": "posts",
  "preferedAuthor": "@chucknorris"
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request

### Creating a new record

```js
client.bucket("blog").collection("posts")
  .createRecord({title: "My first post", content: "Hello World!"})
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "content": "Hello World!",
    "last_modified": 1456183657846,
    "id": "cb0f7b2b-e78f-41a8-afad-92a56f8c88db",
    "title": "My first post"
  },
  "permissions": {
    "write": [
      "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8"
    ]
  }
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request;
- `safe`: Whether to override existing resource if it already exists and if an id is provided (default: `false`)

### Retrieving an existing record

```js
client.bucket("blog").collection("posts")
  .getRecord("cb0f7b2b-e78f-41a8-afad-92a56f8c88db")
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "content": "Hello World!",
    "last_modified": 1456183657846,
    "id": "cb0f7b2b-e78f-41a8-afad-92a56f8c88db",
    "title": "My first post"
  },
  "permissions": {
    "write": [
      "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8"
    ]
  }
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request;
- `safe`: Ensures an existing record with this ID won't be overridden (default: `false`).

### Updating an existing record

```js
const updated = {
  id: "cb0f7b2b-e78f-41a8-afad-92a56f8c88db",
  title: "My first post, edited",
  content: "Hello World, again!"
};

client.bucket("blog").collection("posts")
  .updateRecord(updated)
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "content": "Hello World, again!",
    "last_modified": 1456183778891,
    "id": "cb0f7b2b-e78f-41a8-afad-92a56f8c88db",
    "title": "My first post, edited"
  },
  "permissions": {
    "write": [
      "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8"
    ]
  }
}
```

#### Options

- `patch`: Patches the existing record instead of replacing it (default: `false`)
- `headers`: Custom headers object to send along the HTTP request;
- `safe`: If `last_modified` is provided, ensures the resource hasn't been modified since that timestamp. Otherwise ensures no existing resource with the provided id will be overriden (default: `false`);

### Deleting record

```js
client.bucket("blog").collection("posts")
  .deleteRecord("cb0f7b2b-e78f-41a8-afad-92a56f8c88db")
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "deleted": true,
    "last_modified": 1456183877287,
    "id": "cb0f7b2b-e78f-41a8-afad-92a56f8c88db"
  }
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request;
- `safe`: Ensures the resource hasn't been modified in the meanwhile if `last_modified` is provided (default: `false`);
- `last_modified`: When `safe` is true, the last timestamp we know the resource has been updated on the server.

### Listing records

```js
client.bucket("blog").collection("posts")
  .listRecords()
  .then(result => ...);
```

Sample result:

```js
{
  last_modified: "\"1456183930780\"",
  next: <Function>,
  data: [
    {
      "content": "True.",
      "last_modified": 1456183930780,
      "id": "a89dd4b2-d597-4192-bc2b-834116244d29",
      "title": "I love cheese"
    },
    {
      "content": "Yo",
      "last_modified": 1456183914275,
      "id": "63c1805a-565a-46cc-bfb3-007dfad54065",
      "title": "Another post"
    }
  ]
}
```

Note the root `last_modified` value which is the [collection's timestamp](http://kinto.readthedocs.io/en/stable/core/api/timestamps.html). This value is opaque and should be reused as is, eg. passing it as a `since` option (see the *Options* section below).

#### Sorting

By default, records are listed by `last_modified` descending order. You can set the `sort` option to order by another field:

```js
client.bucket("blog").collection("posts")
  .listRecords({sort: "title"})
  .then(({data, next}) => {
```

#### Polling for changes

To retrieve the list of records modified since a given timestamp, use the `since` option:

```js
client.bucket("blog").collection("posts")
  .listRecords({since: "\"1456183930780\""})
  .then(({data, next}) => {
```

#### Pagination

By default, all records returned by the server are retrieved. To specify a max number of records to retrieve, you can use the `limit` option:

```js
client.bucket("blog").collection("posts")
  .listRecords({limit: 20})
  .then(({data, next}) => {
```

To retrieve the next page of records, just call `next()` from the result object obtained. If no next page is available, `next()` throws an error you can catch to exit the flow:

```js
let getNextPage;

client.bucket("blog").collection("posts")
  .listRecords({limit: 20})
  .then(({data, next}) => {
    console.log("Page 1", data);
    getNextPage = next;
  });
```

Later down the flow:

```js
getNextPage()
  .then(({data, next}) => {
    console.log("Page 2", data);
  })
  .catch(_ => {
    console.log("No more pages.");
  });
```

Last, if you just want to retrieve and aggregate a given number of result pages, instead of dealing with calling `next()` recursively you can simply specify the `pages` option:

```js
client.bucket("blog").collection("posts")
  .listRecords({limit: 20, pages: 3})
  .then(({data, next}) => ...); // A maximum of 60 records will be retrieved here
```

> ##### Notes
>
> If you plan on fetching all the available pages, you can set the `pages` option to `Infinity`. Be aware that for large datasets this strategy can possibly issue an important amount of HTTP requests.

#### Options

- `sort`: The order field (default: `-last_modified`);
- `pages`: The number of result pages to retrieve (default: `1`);
- `limit`: The number of records to retrieve per page: unset by default, uses default server configuration;
- `filters`: An object defining the filters to apply; read more about [what's supported](http://kinto.readthedocs.io/en/stable/core/api/resource.html#filtering);
- `since`: The ETag header value received from the last response from the server.
- `headers`: Custom headers object to send along the HTTP request;

### Batching operations

This allows performing multiple operations in a single HTTP request.

```js
client.bucket("blog").collection("posts")
  .batch(batch => {
    batch.deleteRecord("cb0f7b2b-e78f-41a8-afad-92a56f8c88db");
    batch.createRecord({title: "new post", content: "yo"});
    batch.createRecord({title: "another", content: "yo again"});
  })
  .then(result => ...);
```

Sample result:

```js
[
  {
    "status": 200,
    "path": "/v1/buckets/blog/collections/posts/records/a89dd4b2-d597-4192-bc2b-834116244d29",
    "body": {
      "data": {
        "deleted": true,
        "last_modified": 1456184078090,
        "id": "a89dd4b2-d597-4192-bc2b-834116244d29"
      }
    },
    "headers": {
      "Content-Length": "99",
      "Content-Type": "application/json; charset=UTF-8",
      "Access-Control-Expose-Headers": "Retry-After, Content-Length, Alert, Backoff"
    }
  },
  {
    "status": 201,
    "path": "/v1/buckets/blog/collections/posts/records",
    "body": {
      "data": {
        "content": "yo",
        "last_modified": 1456184078096,
        "id": "afd650b3-1625-42f6-8994-860e52d39201",
        "title": "new post"
      },
      "permissions": {
        "write": [
          "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8"
        ]
      }
    },
    "headers": {
      "Content-Length": "221",
      "Content-Type": "application/json; charset=UTF-8",
      "Access-Control-Expose-Headers": "Retry-After, Content-Length, Alert, Backoff"
    }
  },
  {
    "status": 201,
    "path": "/v1/buckets/blog/collections/posts/records",
    "body": {
      "data": {
        "content": "yo again",
        "last_modified": 1456184078102,
        "id": "22c1319e-7b09-46db-bec4-c240bdf4e3e9",
        "title": "another"
      },
      "permissions": {
        "write": [
          "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8"
        ]
      }
    },
    "headers": {
      "Content-Length": "226",
      "Content-Type": "application/json; charset=UTF-8",
      "Access-Control-Expose-Headers": "Retry-After, Content-Length, Alert, Backoff"
    }
  }
]
```

#### Options

- `headers`: Custom headers object to send along the HTTP request;
- `safe`: Ensures operations won't override existing resources on the server if their associated `last_modified` value or option are provided; otherwise ensures resources won't be overriden if they already exist on the server;
- `aggregate`: Produces an aggregated result object, grouped by operation types; the result object has the following structure:

```js
{
  "errors":    [], // Encountered errors (HTTP 400, >=500)
  "published": [], // Successfully published resources (HTTP 200, 201)
  "conflicts": [], // Conflicting resources (HTTP 412)
  "skipped":   []  // Missing target resources on the server (HTTP 404)
}
```

## Options

Both `bucket()` and `collection()` methods accept an `options` object as a second arguments where you can define the following options:

- `{Object} headers`: Custom headers to send along the request;
- `{Boolean} safe`: Ensure safe transactional operations; read more about that below.

Sample usage:

```js
client.bucket("blog", {
  headers: {"X-Hello": "Hello!"},
  safe: true
});
```

Here the `X-Hello` header and the `safe` option will be used for building every outgoing request sent to the server, for every collection attached to this bucket.

This works at the collection level as well:

```js
client.bucket("blog")
  .collection("posts", {
    headers: {"X-Hello": "Hello!"},
    safe: true
  });
```

Every request sent for this collection will have the options applied.

Last, you can of course pass these options at the atomic operation level:

```js
client.bucket("blog")
  .collection("posts")
  .updateRecord(updatedRecord, {
    headers: {"X-Hello": "Hello!"},
    safe: true
  });
```

The cool thing being you can always override the default defined options at the atomic operation level:

```js
client.bucket("blog", {safe: true})
  .collection("posts")
  .updateRecord(updatedRecord, {safe: false});
```

## The `safe` option explained

The `safe` option can be used:

- when creating or updating a resource, to ensure that any already existing record matching the provided ID won't be overridden if it exists on the server;
- when updating or deleting a resource, to ensure it won't be overridden remotely if it has changed in the meanwhile on the server (requires a `last_modified` value to be provided).

### Safe creations

When creating a new ressource, using the `safe` option will ensure the resource will be created only if it doesn't already exist on the server.

### Safe updates

If a `last_modified` property value is set in the resource object being updated, the `safe` option will ensure it won't be overriden if it's been modified on the server since that `last_modified` timestamp, raising an `HTTP 412` response describing the conflict when that happens:

```js
const updatedRecord = {
  id: "fbd2a565-8c10-497a-95b8-ce4ea6f474e1",
  title: "new post, modified",
  content: "yoyo",
  last_modified: 1456184189160
};

client.bucket("blog")
  .collection("posts")
  .updateRecord(updatedRecord, {safe: true});
```

If this record has been modified on the server already, meaning its `last_modified` is greater than the one we provide , we'll get a `412` error response.

If no `last_modified` value is provided at all, a safe update will simply guarantee that an existing resource with the provided ID won't be overriden.

### Safe deletions

The same applies for deletions, where you can pass both a `safe` and `last_modified` options:

```js
client.bucket("blog")
  .collection("posts")
  .deleteRecord("fbd2a565-8c10-497a-95b8-ce4ea6f474e1", {
    safe: true,
    last_modified: 1456184189160
  });
```
