# serverless-crawler

Distributed serverless web crawling/web scraping with support for js execution, proxying, and autoscaling

## Quick Start

1. Start up redis and browserless
    ```sh
    cli boostrap
    ```
1. Generate a job definition
    ```sh
    cli generate job-definition
    ```
1. Start the job
    ```
    cli start job-definition
    ```

## Reference

* Getting started
* Concepts
* API
* CLI
* Quick Starts
    * AWS
    * Google Cloud Platform
    * Azure
* Examples
    * Basic example
    * Login example
    * Storing data example

## Process Overview

1. A job definition is packaged along with serverless-crawler for a cloud function provider and uploaded
1. The function is invoked which will start the crawl process
1. Links matching the criteria in the job definition are returned along with optional data extracted from the page
1. Function will recursively call itself with the links found until the deptch limit is met or a stop condition is encountered

## Architecture

A reference archtecture for a crawling system based on this project

## Concepts

* store - user defined state shared amongst all functions
* job definition - a javascript object defining a job to crawl a given site. also serves as the input into the crawler