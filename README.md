kinto-http.js
=============

[![Build Status](https://travis-ci.org/Kinto/kinto-http.js.svg?branch=master)](https://travis-ci.org/Kinto/kinto-http.js)

A JavaScript HTTP Client for the [Kinto](http://kinto-storage.org/) API.

Read the [API documentation](https://doc.esdoc.org/github.com/Kinto/kinto-http.js/).

## Table of Contents

  - [Installation](#installation)
  - [Usage](#usage)
  - [Authentication](#authentication)
     - [Using Basic Auth](#using-basic-auth)
     - [Using an OAuth Bearer Token](#using-an-oauth-bearer-token)
  - [Server information](#server-information)
  - [Buckets](#buckets)
     - [Listing buckets](#listing-buckets)
     - [Creating a new bucket](#creating-a-new-bucket)
     - [Selecting a bucket](#selecting-a-bucket)
     - [Getting bucket data](#getting-bucket-data)
     - [Setting bucket data](#setting-bucket-data)
     - [Getting bucket permissions](#getting-bucket-permissions)
     - [Setting bucket permissions](#setting-bucket-permissions)
     - [Deleting a bucket](#deleting-a-bucket)
     - [Creating a collection](#creating-a-collection)
     - [Listing bucket collections](#listing-bucket-collections)
     - [Deleting a collection](#deleting-a-collection)
     - [Creating a user group](#creating-a-user-group)
     - [Listing bucket groups](#listing-bucket-groups)
     - [Getting a bucket group](#getting-a-bucket-group)
     - [Updating an existing group](#updating-an-existing-group)
     - [Deleting a group](#deleting-a-group)
     - [Listing bucket history](#listing-bucket-history)
  - [Collections](#collections)
     - [Selecting a collection](#selecting-a-collection)
     - [Getting collection data](#getting-collection-data)
     - [Setting collection data](#setting-collection-data)
     - [Getting collection permissions](#getting-collection-permissions)
     - [Setting collection permissions](#setting-collection-permissions)
     - [Creating a new record](#creating-a-new-record)
     - [Retrieving an existing record](#retrieving-an-existing-record)
     - [Updating an existing record](#updating-an-existing-record)
     - [Deleting record](#deleting-record)
     - [Listing records](#listing-records)
     - [Batching operations](#batching-operations)
  - [Listing all resource permissions](#listing-all-resource-permissions)
  - [Attachments](#attachments)
     - [Adding an attachment to a record](#adding-an-attachment-to-a-record)
     - [Updating an attachment](#updating-an-attachment)
     - [Deleting an attachment](#deleting-an-attachment)
  - [Generic bucket and collection options](#generic-bucket-and-collection-options)
  - [The safe option explained](#the-safe-option-explained)
     - [Safe creations](#safe-creations)
     - [Safe updates](#safe-updates)
     - [Safe deletions](#safe-deletions)
  - [Generic options for list operations](#generic-options-for-list-operations)
     - [Sorting](#sorting)
     - [Polling for changes](#polling-for-changes)
     - [Paginating results](#paginating-results)
  - [Events](#events)
     - [The backoff event](#the-backoff-event)
     - [The deprecated event](#the-deprecated-event)
     - [The retry-after event](#the-retry-after-event)

---

## Installation

In the browser, you can load prebuilt scripts hosted on npmcdn:

- [kinto-http.js](https://npmcdn.com/kinto-http/dist/kinto-http.js)
- [kinto-http.min.js](https://npmcdn.com/kinto-http/dist/kinto-http.min.js)
- [kinto-http.noshim.js](https://npmcdn.com/kinto-http/dist/kinto-http.noshim.js)

```html
<script src="https://npmcdn.com/kinto-http/dist/kinto-http.min.js"></script>
```

In nodejs:

```
$ npm install kinto-http --save
```

Then (ES6):

```js
import KintoClient from "kinto-http";
```

Or (ES5):

```js
var KintoClient = require("kinto-http").default;
```

Note that this HTTP client can be transparently used server side or in a regular browser page. In the browser, creating an instance is achieved that way:

```js
const client = new KintoClient.default("http://");
```

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

## Server information

A Kinto server exposes some of its internal settings, information about authenticated user, the HTTP API version and the API capabilities (e.g. plugins).

```js
client.fetchServerInfo([options])
  .then(({data}) => ...);
```

Sample result:

```js
{
    "project_name": "kinto",
    "project_version": "3.0.2",
    "url": "http://0.0.0.0:8889/v1/",
    "project_docs": "https://kinto.readthedocs.io/",
    "http_api_version": "1.6",
    "settings": {
        "batch_max_requests": 25,
        "readonly": false
    },
    "user": {
        "bucket": "2f9b1aaa-552d-48e8-1b78-371dd08688b3",
        "id": "basicauth:f505765817a6b4ea46278be0620ddedd83b10f71f7695683719fe001cf0871d7"
    },
    "capabilities": {
        "default_bucket": {
            "description": "The default bucket is an alias for a personal bucket where collections are created implicitly.",
            "url": "http://kinto.readthedocs.io/en/latest/api/1.x/buckets.html#personal-bucket-default"
        }
    }
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request


#### Helpers

- `fetchServerSettings([options])`: server settings
- `fetchServerCapabilities([options])`: API capabilities
- `fetchUser()`: authenticated user information
- `fetchHTTPApiVersion([options])`: HTTP API version


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

This method accepts the [generic parameters for sorting, filtering and paginating results](#generic-options-for-list-operations).


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

### Getting bucket data

```js
client.bucket("blog").getData()
  .then(result => ...);
```

Sample result:

```js
{
  "last_modified": 1456182336242,
  "id": "blog",
  "foo": "bar"
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request


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

#### With an ID generated automatically

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

> Note: For generated names, options can be specified only if the first parameters are provided: `createCollection(undefined, {safe: true})`

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

This method accepts the [generic parameters for sorting, filtering and paginating results](#generic-options-for-list-operations).


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

### Creating a user group

Kinto has a concept of groups of users. A group has a list of members and belongs to a bucket.

Permissions can refer to the group instead of an individuals - this makes it easy to define «roles», especially if the same set of permissions is applied to several objects.

When used in permissions definitions, the full group URI has to be used:

```js
    {
      data: {
        title: "My article"
      },
      permissions: {
        write: ["/buckets/blog/groups/authors", "github:lili"],
        read: ["system.Everyone"]
      }
    }
```

#### Named group

```js
client.bucket("blog").createGroup("admins")
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "last_modified": 1456183004372,
    "id": "admins",
    "members": []
  },
  "permissions": {
    "write": [
      "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8"
    ]
  }
}
```

#### With a list of members and attributes

```js
client.bucket("blog").createGroup("admins", ["system.Authenticated"], {data: {pi: 3.14}})
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "last_modified": 1456183004372,
    "id": "admins",
    "members": ["system.Authenticated"],
    "pi": 3.14
  },
  "permissions": {
    "write": [
      "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8"
    ]
  }
}
```

#### With an ID generated automatically

```js
client.bucket("blog").createGroup()
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "last_modified": 1456183040592,
    "members": [],
    "id": "7YHFF565"
  },
  "permissions": {
    "write": [
      "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8"
    ]
  }
}
```

Note that `7YHFF565` is the group ID automatically generated by the server.

#### Options

- `headers`: Custom headers object to send along the HTTP request
- `safe`: Whether to override existing resource if it already exists (default: `false`)
- `data`: Extra group attributes.
- `permissions`: Permissions to be set on the created group.

> Note: For generated names, options can be specified only if the first parameters are provided: `createGroup(undefined, [], {safe: true})`


### Listing bucket groups

```js
client.bucket("blog").listGroups()
  .then(({data}) => ...);
```

Sample result:

```js
{
  "data": [
    {
      "last_modified": 1456183153840,
      "id": "admins",
      "members": ["system.Authenticated"],
      "pi": 3.14
    },
    {
      "last_modified": 1456183159386,
      "id": "moderators",
      "members": ["github:lili"]
    }
  ]
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request

This method accepts the [generic parameters for sorting, filtering and paginating results](#generic-options-for-list-operations).


### Getting a bucket group

```js
client.bucket("blog").getGroup("admins")
  .then(({data}) => ...);
```

Sample result:

```js
{
  "data": {
      "last_modified": 1456183153840,
      "id": "admins",
      "members": ["system.Authenticated"],
      "pi": 3.14
  }
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request

### Updating an existing group

```js
const updated = {
  id: "cb0f7b2b-e78f-41a8-afad-92a56f8c88db",
  members: ["system.Everyone", "github:lili"],
  pi: 3.141592
};

client.bucket("blog").updateGroup(updated, {permissions: {write: ["fxa:35478"]}})
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "last_modified": 1456183778891,
    "id": "cb0f7b2b-e78f-41a8-afad-92a56f8c88db",
    "members": ["system.Everyone", "github:lili"],
    "pi": 3.141592
  },
  "permissions": {
    "write": [
      "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8",
      "fxa:35478"
    ]
  }
}
```

#### Options

- `patch`: Patches the existing record instead of replacing it (default: `false`)
- `headers`: Custom headers object to send along the HTTP request;
- `safe`: If `last_modified` is provided, ensures the resource hasn't been modified since that timestamp. Otherwise ensures no existing resource with the provided id will be overriden (default: `false`);
- `permissions`: Permissions to be set on the group.

### Deleting a group

```js
client.bucket("blog").deleteGroup("admins")
  .then(result => ...);
```

Sample result:

```js
{
  "data": {
    "deleted": true,
    "last_modified": 1456183116571,
    "id": "admins"
  }
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request;
- `safe`: Ensures the resource hasn't been modified in the meanwhile if `last_modified` is provided (default: `false`);
- `last_modified`: The last timestamp we know the resource has been updated on the server.


### Listing bucket history

```js
client.bucket("blog").listHistory()
  .then(({data}) => ...);
```

Sample result:

```js
{
  "data": [
    {
      "action": "update",
      "collection_id": "articles",
      "date": "2016-07-20T11:18:36.530281",
      "id": "cb98ecd7-a66f-4f9d-82c5-73d06930f4f2",
      "last_modified": 1469006316530,
      "record_id": "b3b76c56-b6df-4195-8189-d79da4a128e1",
      "resource_name": "record",
      "target": {
          "data": {
              "id": "b3b76c56-b6df-4195-8189-d79da4a128e1",
              "last_modified": 1469006316529,
              "title": "Modified title"
          },
          "permissions": {
              "write": [
                  "basicauth:43181ac0ae7581a23288c25a98786ef9db86433c62a04fd6071d11653ee69089"
              ]
          }
      },
      "timestamp": 1469006098757,
      "uri": "/buckets/blog/collections/articles/records/b3b76c56-b6df-4195-8189-d79da4a128e1",
      "user_id": "basicauth:43181ac0ae7581a23288c25a98786ef9db86433c62a04fd6071d11653ee69089",
    }
  ]
}

```

#### Options

- `headers`: Custom headers object to send along the HTTP request

This method accepts the [generic parameters for sorting, filtering and paginating results](#generic-options-for-list-operations).


## Collections

### Selecting a collection

```js
const posts = client.bucket("blog").collection("posts");
```

### Getting collection data

```js
client.bucket("blog").collection("posts").getData()
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

### Setting collection data

```js
client.bucket("blog").collection("posts")
  .setData({preferedAuthor: "@chucknorris"})
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

### Getting collection permissions

```js
client.bucket("blog").collection("posts").getPermissions()
  .then(result => ...);
```

Sample result:

```js
{
  "write": [
    "basicauth:0f7c1b72cdc89b9d42a2d48d5f0b291a1e8afd408cc38a2197cdf508269cecc8",
  ]
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request

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
  last_modified: "1456183930780",
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

#### Options

- `headers`: Custom headers object to send along the HTTP request;

This method accepts the [generic parameters for sorting, filtering and paginating results](#generic-options-for-list-operations).


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

## Listing all resource permissions

If the [`permissions_endpoint` capability](http://kinto.readthedocs.io/en/stable/api/1.x/permissions.html#list-every-permissions) is installed on the server, you can retrieve the list of all permissions set for the authenticated user using the `listPermissions()` method:

```js
client.listPermissions([options])
  .then(result => ...);
```

Sample result:

```js
{
  "data": [
    {
      "bucket_id": "mybucket",
      "id": "mybucket",
      "permissions": [
        "write",
        "read",
        "group:create",
        "collection:create"
      ],
      "resource_name": "bucket",
      "uri": "/buckets/mybucket"
    },
    ...
  ]
}
```

#### Options

- `headers`: Custom headers object to send along the HTTP request.

## Attachments

If the [attachment](https://github.com/Kinto/kinto-attachment) capability is available from the Kinto server, you can attach files to records. Files must be passed as [data urls](http://dataurl.net/#about), which can be generated using the [FileReader API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL) in the browser.

### Adding an attachment to a record

```js
client.bucket("blog").collection("posts")
  .addAttachment(dataURL, {title: "First post"});
```

#### Options

- `headers`: Custom headers object to send along the HTTP request;
- `safe`: Ensures operations won't override existing resources on the server if their associated `last_modified` value or option are provided; otherwise ensures resources won't be overriden if they already exist on the server;
- `last_modified`: When `safe` is true, the last timestamp we know the resource has been updated on the server;
- `permissions`: Permissions to be set on the record;
- `filename`: Allows to specify the attachment filename, in case the data URI does not contain any, or if the file has to be renamed on upload;


### Updating an attachment

```js
client.bucket("blog").collection("posts")
  .addAttachment(dataURL, {id: "22c1319e-7b09-46db-bec4-c240bdf4e3e9"});
```

### Deleting an attachment

```js
client.bucket("blog").collection("posts")
  .removeAttachment("22c1319e-7b09-46db-bec4-c240bdf4e3e9");
```

## Generic bucket and collection options

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

## Generic options for list operations

Every list operations like [listBuckets()](#listing-buckets), [listCollections](#listing-bucket-collections), [listHistory](#listing-bucket-history), [listGroups()](#list-bucket-groups) or [listRecords()](#listing-records) accept parameters to sort, filter and paginate the results:

- `sort`: The order field (default: `-last_modified`);
- `pages`: The number of result pages to retrieve (default: `1`);
- `limit`: The number of records to retrieve per page: unset by default, uses default server configuration;
- `filters`: An object defining the filters to apply; read more about [what's supported](http://kinto.readthedocs.io/en/stable/core/api/resource.html#filtering);
- `since`: The ETag header value received from the last response from the server.

### Sorting

By default, results are listed by `last_modified` descending order. You can set the `sort` option to order by another field:

```js
client.bucket("blog").collection("posts")
  .listRecords({sort: "title"})
  .then(({data, next}) => {
```

### Polling for changes

To retrieve the results modified since a given timestamp, use the `since` option:

```js
client.bucket("blog").collection("posts")
  .listRecords({since: "1456183930780"})
  .then(({data, next}) => {
```

### Paginating results

By default, all results of the first page are retrieved, and the default configuration of the server defines no limit. To specify a max number of results to retrieve, you can use the `limit` option:

```js
client.bucket("blog").collection("posts")
  .listRecords({limit: 20})
  .then(({data, next}) => {
```

To retrieve the next page of results, you can check for the `next` property attached to the result object obtained. If a next page is available, `next` is a function you can call to retrieve the next page of results, and becomes a `null` when pagination is exhausted:

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
if (getNextPage) {
  getNextPage()
    .then(({data, next}) => {
      console.log("Page 2", data);
      getNextPage = next; // etc...
    });
} else {
  console.log("No more pages.")
}
```

Last, if you just want to retrieve and aggregate a given number of result pages, instead of dealing with calling `next()` recursively you can simply specify the `pages` option:

```js
client.bucket("blog").collection("posts")
  .listRecords({limit: 20, pages: 3})
  .then(({data, next}) => ...); // A maximum of 60 results will be retrieved here
```

> ##### Notes
>
> If you plan on fetching all the available pages, you can set the `pages` option to `Infinity`. Be aware that for large datasets this strategy can possibly issue an important amount of HTTP requests.


## Events

The `KintoClient` exposes an `events` property you can subscribe public events from. That `events` property implements nodejs' [EventEmitter interface](https://nodejs.org/api/events.html#events_class_events_eventemitter).


### The `backoff` event

Triggered when a `Backoff` HTTP header has been received from the last received response from the server, meaning clients should hold on performing further requests during a given amount of time.

The `backoff` event notifies what's the backoff release timestamp you should wait until before performing another operation:

```js
const client = new KintoClient();

client.events.on("backoff", function(releaseTime) {
  const releaseDate = new Date(releaseTime).toLocaleString();
  alert(`Backed off; wait until ${releaseDate} to retry`);
});
```

### The `deprecated` event

Triggered when an `Alert` HTTP header is received from the server, meaning that a feature has been deprecated; the `event` argument received by the event listener contains the following deprecation information:

- `type`: The type of deprecation, which in ou case is always `soft-eol` (`hard-eol` alerts trigger an `HTTP 410 Gone` error);
- `message`: The deprecation alert message;
- `url`: The URL you can get information about the related deprecation policy.

```js
const client = new KintoClient();

client.events.on("deprecated", function(event) {
  console.log(event.message);
});
```

### The `retry-after` event

When an error occurs on server, a `Retry-After` HTTP header indicates the duration in seconds that clients should wait before retrying the request.

The `retry-after` event notifies what is the timestamp you should wait until before performing another operation:

```js
const client = new KintoClient();

client.events.on("retry-after", function(releaseTime) {
  const releaseDate = new Date(releaseTime).toLocaleString();
  alert(`Wait until ${releaseDate} to retry`);
});
```

> #### Note:
> Eventually, we would like to automate the retry behaviour for requests. See https://github.com/Kinto/kinto-http.js/issues/34
