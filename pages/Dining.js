
import React, { Component } from 'react';
import {
  Text,
  View,
  ListView,
  TouchableHighlight,
  StatusBar,
} from 'react-native';

import Refresh from '../components/Refresh.js';
import UsageBar from '../components/UsageBar.js';
import Filter from '../components/Filter.js';
import PulsePage from './PulsePage.js';


/**** A Handful of Useful Functions & Globals ****/

function shortenName(locationName) {
    /*Shortens the longer location names on this list to their more colloquial names.*/
    var longNames = {"Bear Necessities Grill & C-Store":"Bear Necessities", 
                    "Robert Purcell Marketplace Eatery":"RPCC", 
                    "Jansen's Dining Room at Bethe House":"Bethe House Dining Room"};
    return longNames[locationName] ? longNames[locationName] : locationName;
}


function filterClosed(locationList, subsetList) {
    
    var closed = []; // holds location objects that are closed
    var open = []; 

    locationList.forEach(el => {
        if (subsetList.indexOf(el.location) != -1) {
            if (el.status === 'Closed') {
                closed.push(el);
            } else {
                open.push(el);
            }
        }
    })
    return open.concat(closed);
}

function getTimeSpan(rowData) {
    /* Used in determining the timeSpan that a location is open for (in render() below)  */
    let date = new Date();
    if(!["Mac's Café", "Terrace"].includes(rowData.location)) {
        return rowData.currentEvent.start + ' - ' + rowData.currentEvent.end;
    } else {
        if (rowData.location === "Mac's Café") {
            if (date.getDay() >= 1 && date.getDay() <= 4) { // Mon - Thur schedule
                return "7:30am - 7:30pm";
            } 
            else if (date.getDay() === 5) { // Fri Schedule
                return "7:30am - 2:30pm";
            } 
            else {
                return "Closed";
            }
        } else if (rowData.location === "Terrace") {
            if (date.getDay() >= 1 && date.getDay() <= 5) { // Mon - Fri Schedule
                return "10:00am - 3:00pm";
            } 
            else {
                return "Closed";
            }
        }
    }
}

function getRatio(rowData) {
    if (rowData.status === "Closed") {
        return null;
    } else {
        // Experimental Surge represents relative line length at each location
        let lineLength = rowData.experimentalSurge;

        // (count / peak) represents relative seating capacity at each location (doesn't really apply to non-Dining Hall locations)
        let count = rowData.count ? rowData.count : 0; 
        let peak = rowData.peak == 0 ? 1 : rowData.peak; 
        let ratio = Math.min(1, count/peak); 

        if (rowData.eateryType.descr !== "All You Care To Eat Dining Room" && lineLength) {
            console.log(rowData.location);
            return lineLength; // Because lineLength is a better metric for non-Dining-Hall locations 
        } else {
            return ratio;
        }

    }
}

let cardinalLocations = {
  'North': ["Bear Necessities Grill & C-Store", "Carol's Café", "North Star Dining Room", "Risley Dining Room", "Robert Purcell Marketplace Eatery", "Sweet Sensations"],
  'West': ["Cook House Dining Room", "Becker House Dining Room", "Jansen's Market", "Jansen's Dining Room at Bethe House", "Keeton House Dining Room", "104West!", "Rose House Dining Room"],
  'Central': ["Big Red Barn", "Bus Stop Bagels", "Café Jennie", "Mattin's Café", "Goldie's Café", "Green Dragon", "Ivy Room", "Martha's Café", "Okenshields", "Amit Bhatia Libe Café", "Rusty's", "Atrium Café", "Synapsis Café", "Trillium", "Terrace", "Mac's Café"]}


/********** Dining Component ************/


export default class Dining extends Component {
    constructor(props) {
        super(props);
        
        /* Binding the Dining component to the following methods */
        this.changeFilter = this.changeFilter.bind(this); 
        this.props.onForward = this.props.onForward.bind(this);
        this._renderRow = this._renderRow.bind(this);

        let subsetList = cardinalLocations['North'];
        let ds = new ListView.DataSource({rowHasChanged: (r1,r2) => r1 !== r2 });
        this.state = {filterBy: 'North', dataSource: ds.cloneWithRows(filterClosed(this.props.allData.diners, subsetList))};

    }

    changeFilter(newFilter) {
        /* Gets passed to Filter widget as `tap` prop */
        
        let subList = cardinalLocations[newFilter];

        let ds = new ListView.DataSource({rowHasChanged: (r1,r2) => r1 !== r2 });
        this.setState({filterBy: newFilter, 
                       dataSource: ds.cloneWithRows(filterClosed(this.props.allData.diners, subList))});
    }

    _renderRow(rowData) {
        let ratio = getRatio(rowData);

        if (rowData.status === "Closed") {
            let timeSpan = rowData.nextEvent ? rowData.nextEvent.start + ' - ' + rowData.nextEvent.end : 'Closed';
            return (
                <TouchableHighlight
                    underlayColor='#DDDDDD'
                    onPress={() => this.props.onForward(PulsePage, {rowData: rowData, ratio: ratio, timeSpan: timeSpan})}
                    style={{backgroundColor: '#F2F2F2'}}>
                    <View style={{flexDirection : 'row', height: 75, alignItems: 'center'}}>         
                        <View style={{marginLeft: 20}}>
                            <Text style={{fontSize: 17, fontFamily: 'Avenir', color: '#8C8C8C'}}>{shortenName(rowData.location)}</Text>
                            <Text style={{fontSize: 14, fontFamily: 'Avenir', color: '#8C8C8C'}}>{timeSpan}</Text>
                        </View>
                    </View>
                </TouchableHighlight>);
        } else {
            let timeSpan = getTimeSpan(rowData);
            return (
                <TouchableHighlight
                    underlayColor='#DDDDDD'
                    onPress={() => this.props.onForward(PulsePage, {rowData: rowData, ratio: ratio, timeSpan: timeSpan})}>
                    <View style={{justifyContent: 'space-between', alignItems: 'center', flexDirection: 'row', height: 75, opacity: 1}}>         
                        <View style={{marginLeft: 20}}>
                            <Text style={{color: '#262626', fontSize: 17, fontFamily: 'Avenir'}}>{shortenName(rowData.location)}</Text>
                            <Text style={{color: '#8C8C8C', fontSize: 14, fontFamily: 'Avenir'}}>{timeSpan}</Text>
                        </View>
                        <View style={{marginRight: 20}}>
                            <UsageBar ratio={ratio}/>
                        </View>
                    </View>
                </TouchableHighlight>);
        }
    }

    render() {
        /*Beware Hack: ListView doesn't scroll all the way down to the last member of the list,
            so solution is to adjust the height of the View that immediately dominates <ListView> so everything fits*/
        let page;
        if (this.props.allData.diners.length > 0) {
            page = (

                <View style={{height: 594}}>
                    <Filter filterBy={this.state.filterBy} tap={this.changeFilter}/>

                    <ListView
                        style={{}}
                        dataSource={this.state.dataSource}
                        renderRow={this._renderRow}
                        enableEmptySections={true} />
                </View>
            );
        } else {
            page = (<Refresh refresh={this.props.refresh}/>)
        }
        return (
            <View style={{flex:1}}>
                <StatusBar barStyle='light-content'/>
                <View style={{backgroundColor: 'black', height: 24}}></View>
                {page}

            </View>
        );
    }
}

