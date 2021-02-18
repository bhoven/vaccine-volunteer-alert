const { SNS, DynamoDB } = require('aws-sdk')
const axios = require('axios')

const volunteerUrl = 'https://volunteer.covidvaccineseattle.org'
const foundTermsTableName = process.env.FOUND_TERMS_TABLE_NAME

exports.handler = async function handler(event) {
  console.log("request: ", JSON.stringify(event, undefined, 2))

  const response = await axios.get(volunteerUrl)
  console.log('Response status: ', response.status)

  let foundTerms = []
  const searchTerms = generateSearchTerms()
  console.log('Search terms: ', searchTerms)
  searchTerms.forEach(searchTerm => {
    if (response.data.includes(searchTerm)) {
      foundTerms.push(searchTerm)
    }
  })
  console.log('Found terms: ', foundTerms)

  const newFoundTerms = await filterToNewFoundTerms(foundTerms)
  if (newFoundTerms.length > 0) {
    let message = 'Found availability: ' + foundTerms.join(', ')
    const params = {
      Message: message,
      TopicArn: process.env.ALERT_TOPIC_ARN
    }
    console.log("Publishing message to alert topic: ", message)

    const sns = new SNS()
    await sns.publish(params).promise()
  } else {
    console.log('No availablility found')
  }

  return {
    statusCode: 200,
    headers: {"Content-Type": "application/json"},
    body: {
      "foundTerms": foundTerms,
      "newFoundTerms": newFoundTerms
    }
  }
}

function generateSearchTerms() {
  let startDate = new Date()
  while (startDate.getDay() != 1) {
    startDate.setDate(startDate.getDate() + 1)
  }

  searchTerms = []
  // Search for options in the next 6 weeks
  for (let i = 0; i < 6; i++) {
    searchTerms.push(generateSearchTerm(startDate))
    startDate.setDate(startDate.getDate() + 7)
  }
  return searchTerms
}

function generateSearchTerm(startDate) {
  let endDate = new Date(startDate.getTime())
  endDate.setDate(endDate.getDate() + 5)

  const startDateMonth = startDate.toLocaleString('en-US', { month: 'short' })
  const startDayNumber = startDate.toLocaleString('en-US', { day: 'numeric' })
  const startDay = dateOrdinal(startDayNumber)

  const endDateMonth = endDate.toLocaleString('en-US', { month: 'short' })
  const endDayNumber = endDate.toLocaleString('en-US', { day: 'numeric' })
  const endDay = dateOrdinal(endDayNumber)

  const startDateString = startDateMonth + ' ' + startDay
  const endDateString = startDateMonth == endDateMonth ? endDay : endDateMonth + ' ' + endDay

  return startDateString + ' through ' + endDateString
}

function dateOrdinal(dom) {
  if (dom == 31 || dom == 21 || dom == 1) return dom + "st"
  else if (dom == 22 || dom == 2) return dom + "nd"
  else if (dom == 23 || dom == 3) return dom + "rd"
  else return dom + "th"
}

async function filterToNewFoundTerms(foundTerms) {
  const dynamo = new DynamoDB()

  let newFoundTerms = []
  for (const foundTerm of foundTerms) {
    const foundItem = await dynamo.getItem({
      TableName: foundTermsTableName,
      Key: { 
        url: { 'S': volunteerUrl },
        term: { 'S': foundTerm } 
      }
    }).promise()
    console.log("foundItem: ", foundItem)

    if (!foundItem.Item) {
      newFoundTerms.push(foundTerm)

      await dynamo.putItem({
        TableName: foundTermsTableName,
        Item: { 
          url: { 'S': volunteerUrl },
          term: { 'S': foundTerm } 
        }
      }).promise()
    }
  }

  return newFoundTerms
}