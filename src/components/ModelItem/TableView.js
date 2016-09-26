import React, { Component, PropTypes } from 'react'
import { Tab, Switch, Tabs, FontIcon, Card, CardMedia, CardTitle, CardText, CardActions, IconButton } from 'react-toolbox'
import { Link } from 'react-router'
import classes from './TableView.scss'
import MediaQuery from 'react-responsive'
import classnames from 'classnames'

const DESCRIPTION = 'Description'
const LAYOUT = 'Layout'
const SCHEMATIC = 'Schematic'
const PHOTO = 'Photo'
const OTHER = 'Other'

const isImageByExt = (media) => (media.toLowerCase().match(/jpg|png|jpeg|bmp/))

const makeDownloadLink = (linkData) => {
  const {href, text, activeLinkClass, ...other} = linkData
  return (
    <Link to={href} activeClassName={activeLinkClass} target='_blank'>
      {text}
    </Link>
  )
}

export class TableView extends Component {
  state = {}
  static propTypes = {
    itemData: PropTypes.object
  }

  constructor(props) {
    super(props)
    this.makeTableSource = this.makeTableSource.bind(this)
    this.renderTabView = this.renderTabView.bind(this)
    this.sortTable = this.sortTable.bind(this)
    this.sortByField = this.sortByField.bind(this)
  }

  makeTableSource = () => {
    const {itemData} = this.props

    let tableSource = []
    let key = 0

    itemData.schematics.forEach((i) => {
      tableSource.push({
        key: key++,
        type: SCHEMATIC, icon: 'developer_board',
        text: i.schematicName, by: i.schematicContributor,
        href: i.schematic
      })
    })

    itemData.layouts.forEach((i) => {
      tableSource.push({
        key: key++,
        type: LAYOUT, icon: 'collections',
        text: i.layoutName, by: i.layoutContributor,
        href: i.layout
      })
    })

    itemData.others.forEach((i) => {
      tableSource.push({
        key: key++,
        type: OTHER, icon: 'attachment',
        text: i.otherName, by: i.otherContributor,
        href: i.other
      })
    })

    itemData.photos.forEach((i) => {
      tableSource.push({
        key: key++,
        type: PHOTO, icon: (<img src={i.photo} alt={i.photoName} height='36' width='36' />),
        text: i.photoName, by: i.photoContributor,
        href: i.photo
      })
    })

    this.setState({ ...this.state, tableData: tableSource })
}

compareT = (a, b) => {
  const { sort } = this.state
  if (a[sort.by] < b[sort.by]) {
    return -1
  }
  if (a[sort.by] > b[sort.by]) {
    return 1
  }
  return 0
}

sortByField = (field, ascValue) => {
  const { tableData } = this.state
  // synchronous set
  this.state = Object.assign({}, this.state, { sort: { by: field, asc: ascValue } })
  return (tableData.sort(this.compareT))
}

sortTable = (e) => {
  const {sort} = this.state

  if ((sort) && (sort.by === e)) {
    if (sort.asc) {
      this.setState({...this.state,
        tableData: this.sortByField(e, false).reverse()})
  }
  else {
    this.setState({...this.state,
      tableData: this.sortByField(e, true)})
}

} else {
  this.setState({...this.state,
    tableData: this.sortByField(e, true)})
}
  console.log(this.state)
}



renderTabView = () => {
  let sc = this.sortTable.bind(this)
  return (
    <table className={classnames('table', 'table-stripped', 'table-condensed') }>
      <thead className={classes.tableHeader}>
        <tr>
          <th onClick={(e) => sc('type') }>Type</th>
          <th onClick={(e) => sc('text') }>Item</th>
          <th onClick={(e) => sc('by') }>Contributor</th>
        </tr>
      </thead>
      <tbody>
        {this.state.tableData.map((i) => {
          return (<tr key={i.key}>
            <td>
              <FontIcon value={i.icon} title={i.type} className={classes.actionIcons} />
            </td>
            <td>
              {makeDownloadLink({ href: i.href, text: i.text, activeLinkClass: classes.activeRoute }) }
            </td>
            <td>
              {i.by}
            </td>
          </tr>)
        }) }
      </tbody>
    </table>
  )
}


componentDidMount() {
  this.makeTableSource()
}

render() {
  const { itemData } = this.props
  return (
    <div key={itemData.version}>
      {(this.state.tableData) && this.renderTabView() }
    </div>
  )
}
}


export default TableView
