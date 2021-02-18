const { SNS } = require('aws-sdk')
const axios = require('axios')

exports.handler = async function handler(event) {
  console.log("request: ", JSON.stringify(event, undefined, 2))

  const response = await axios.get('https://volunteer.covidvaccineseattle.org')
  console.log('Response status: ', response.status)

  let foundTerms = []
  const searchTerms = generateSearchTerms()
  console.log('Search terms: ', searchTerms)
  searchTerms.forEach(searchTerm => {
    if (response.data.includes(searchTerm)) {
      foundTerms.push(searchTerm)
    }
  })


  if (foundTerms.length > 0) {
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
    headers: {"Content-Type": "text/plain"},
    body: {
      "foundTerms": foundTerms
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

  const startDateString = toShortDate(startDate)
  const endDateString = toShortDate(endDate)
  const searchTerm = startDateString + ' through ' + endDateString
  console.log('Search term: ', searchTerm)
  return searchTerm
}

function toShortDate(date) {
  const month = date.toLocaleString('en-US', { month: 'short' })
  const dayNumber = date.toLocaleString('en-US', { day: 'numeric' })
  const day = dateOrdinal(dayNumber)
  return month + ' ' + day
}

function dateOrdinal(dom) {
  if (dom == 31 || dom == 21 || dom == 1) return dom + "st"
  else if (dom == 22 || dom == 2) return dom + "nd"
  else if (dom == 23 || dom == 3) return dom + "rd"
  else return dom + "th"
};