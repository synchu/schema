/* @flow*/

import {fileObject, emptyAmpItem} from '../interfaces/files.js'
import {getTableData, newVersionRow} from './filesTableData'
import fetch from 'isomorphic-fetch'
import _ from 'lodash'

// ------------------------------------ Constants
// ------------------------------------
export const UPLOAD_REQUEST = 'UPLOAD_REQUEST'
export const UPLOAD_PUSH = 'UPLOAD_PUSH'
export const UPLOAD_SAVE = 'UPLOAD_SAVE'

export const BRANDS_DROPDOWN_REQUEST = 'BRANDS_DROPDOWN_REQUEST'
export const BRANDS_DROPDOWN_SUCCESS = 'BRANDS_DROPDOWN_SUCCESS'
export const BRANDS_DROPDOWN_ERROR = 'BRANDS_DROPDOWN_ERROR'

export const SET_VERSION = 'SET_VERSION'
export const SET_BRAND = 'SET_BRAND'
export const SET_MODEL = 'SET_MODEL'
export const SET_FILES = 'SET_FILES'

export const SET_ERROR = 'SET_ERROR'

export const SET_LAST_NEWID = 'SET_LAST_NEWID'

// ------------------------------------ Utils
// ------------------------------------

const addKey = (item) => {
  let j = 0

  let resultsArray = []
  item.map((i) => {
    let c
    c = i.constructor === Array
      ? Object.assign({}, i)
      : Object.assign({}, [i])
    c = Object.defineProperty(c, 'key', {
      enumerable: true,
      configurable: false,
      writable: false,
      value: j++
    })

    resultsArray.push(c)
  })
  return resultsArray
  // return item.map((i) => Object.assign({}, i, { key: j++ }))
}

const transformAmpsToDropdown = (ampsWithKeys, fromItem, tillItem) => {
  let c = {}
  const transformToAutocomplete = (v) => {
    let b = ''
    for (var i = fromItem; i < tillItem + 1; i++) {
      b = b + v[i] + ' '
    }
    return b.trim()
  }

  ampsWithKeys.map((a) => {
    c = Object.defineProperty(c, a['key'].toString(), {
      enumerable: true,
      configurable: false,
      writable: false,
      value: transformToAutocomplete(a)
    })
  })
  return c
}
// ------------------------------------ Actions
// ------------------------------------

export const validateFormData = (newData) => {}

export const requestBrandsDropdown = () => {
  return {type: BRANDS_DROPDOWN_REQUEST, isFetching: true}
}

export const errorBrandsDropdown = (message : string) => {
  return {type: BRANDS_DROPDOWN_ERROR, errorMessage: message, snackMessage: message, isFetching: false}
}

export const successAmpsDropdown = (amps) => {
  return {
    type: BRANDS_DROPDOWN_SUCCESS,
    amps: transformAmpsToDropdown(addKey(_.uniq(amps.versions.records.map(i => (i[2])))), 0, 0),
    ampVersions: transformAmpsToDropdown(addKey(amps.versions.records), 0, 2),
    rawdata: amps.versions.records
  }
}

export const fetchBrandsDropdown = () => {
  return (dispatch) => {
    dispatch(requestBrandsDropdown())
    return (fetch('http://thesubjectmatter.com/api.php/versions?order=version,asc').then((response) => response.json()).then((json) => {
      dispatch(successAmpsDropdown(json))
    }).catch(error => {
      console.error('Load brands dropdown error:', error)
    }))
  }
}

export const loadBrandsDropdown = () => {
  // TODO: caching and pagination
  return (dispatch, getState) => {
    if (getState().Home.ampVersions && (getState().Home.ampVersions.length > 0)) {
      console.log('amp versions cache hit')
      return
    }
    return dispatch(fetchBrandsDropdown())
  }
}

const findInObj = (object, value) => {
  for (var property in object) {
    if (object.hasOwnProperty(property)) {
      if (object[property] === value) {
        return true
      }
    }
  }
  return false
}

export const setBrand = (value, change, array) => {
  return (dispatch, getState) => {
    let c = {}
    // TODO: Find the fix - a tricky bit, since Autocomplete box selection  returns
    // index when selected from the list, but text value when not. We need to find
    // out reliably whether there's a match in the DB
    const findBrand = () => getState().uploadFile.amps[value] === undefined
      ? findInObj(getState().uploadFile.amps, value)
      : getState().uploadFile.amps[value]
    let foundBrand = findBrand()
    _.uniqBy(getState().uploadFile.rawdata.filter((i) => i[2] === foundBrand), '1').map(a => {
      c = Object.defineProperty(c, a[1], {
        enumerable: true,
        configurable: false,
        writable: false,
        value: a[1]
      })
    })
    dispatch({type: SET_BRAND, brand: foundBrand, models: c})
    setModel('', change, array)(dispatch, getState)
    if (change) {
      change('version', '')
      change('model', '')
    }
    setVersion('', change, array)(dispatch, getState)
  }
}

export const setModel = (model, change, array) => {
  return (dispatch, getState) => {
    let c = {}
    const brand = getState().uploadFile.brand
    _.uniqBy(getState().uploadFile.rawdata.filter((i) => (i[1] === model) && (i[2] === brand)), '0').map(a => {
      c = Object.defineProperty(c, a[0], {
        enumerable: true,
        configurable: false,
        writable: false,
        value: a[0]
      })
    })
    dispatch({type: SET_MODEL, model: model, versions: c})
    setVersion('', change, array)(dispatch, getState)
    dispatch({
      type: SET_VERSION,
      versionData: [],
      descriptionDb: '',
      filesData: [],
      description: '',
      contributor: ''
    })
  }
}

export const setVersion = (version, change, array) => {
  return (dispatch, getState) => {
    const brand = getState().uploadFile.brand
    const model = getState().uploadFile.model
    if (!brand || !model || !version || (version === '')) {
      if (change) {
        change('description', '')
        change('contributor', '')
        change('version', '')
        if (array) {
          console.log('cleaning array')
          array.removeAll('files')
        }
        dispatch({type: SET_FILES, filesData: [], versionData: []})
      }
      return
    }
    fetch('http://thesubjectmatter.com/api.php/schematics?filter=version,eq,' + version.trim() + '&transform=1').then((response) => response.json()).then((json) => {
      return json
        .schematics
        .filter(i => i.model.toLowerCase() === model.toLowerCase().trim() && i.brand.toLowerCase() === brand.toLowerCase().trim())
    }).then(item => {
      let descriptionLine = item.filter(i => i.type.trim().toLowerCase() === 'description')[0]
      let descriptionDb = descriptionLine
        ? descriptionLine.data
        : ''
      let contributor = descriptionLine
        ? descriptionLine.contributor
        : ''
      let fileData = item.filter(i => i.type.trim().toLowerCase() !== 'description')
      // change form values
      if (change) {
        change('description', descriptionDb)
        change('contributor', contributor)
      }
      if (array) {
        fileData.map(i =>
          array.push('files', i)
        )
      }
      return dispatch({
        type: SET_VERSION,
        versionData: item,
        descriptionDb: descriptionDb,
        filesData: getTableData(fileData, getState)
      })
    }).catch(r => console.log(r))
    return dispatch({type: SET_VERSION, versionData: [], descriptionDb: '', filesData: []})
  }
}

export const setFilesData = (row, key, value) => {
  return (dispatch, getState) => {
    let filesData = getState().uploadFile.filesData
    console.log(row, key, value)
    filesData[row][key] = value
    return dispatch({type: SET_FILES, filesData: filesData})
  }
}

export const deleteFileData = (rowId, idx, array) => {
  return (dispatch, getState) => {
    let foundRow = -1
    let filesData = getState().uploadFile.filesData
    let versionData = getState().uploadFile.versionData
    for (var i = 0; i < filesData.length; i++) {
      if (filesData[i].id === rowId) {
        foundRow = i
        break
      }
    }
    if (foundRow > -1) {
      let deletedFilesData = getState().uploadFile.deletedFilesData
        ? getState()
          .uploadFile
          .deletedFilesData
          .concat(filesData.splice(i, 1))
        : []

      foundRow = -1

      for (var j = 0; j < versionData.length; j++) {
        if (versionData[j].id === rowId) {
          foundRow = j
          break
        }
      }
      if (foundRow > -1) {
        var deletedVersionData = getState().uploadFile.deletedVersionData
          ? getState()
            .uploadFile
            .deletedVersionData
            .concat(versionData.splice(j, 1))
          : []
      }
      if (array) {
        array.remove('files', idx)
      } else {
        console.warn('no array present')
      }
      dispatch({type: SET_FILES, filesData: filesData, versionData: versionData,
        deletedFilesData: deletedFilesData, deletedVersionData: deletedVersionData})
    } else {
      return
    }
  }
}

export const setDataField = (data, index) => {
  return (dispatch, getState) => {
    let filesData = getState().uploadFile.filesData
    let versionData = getState().uploadFile.versionData

    filesData[index].data = data

    let foundRow = -1

    for (var j = 0; j < versionData.length; j++) {
      if (versionData[j].id === filesData[index].id) {
        foundRow = j
        break
      }
    }
    if (foundRow > -1) {
      versionData[foundRow].data = data
    } else {
      console.warn('Strange days are coming. Version Data differs from files data:', filesData, versionData)
    }
    dispatch({type: SET_FILES, filesData: filesData, versionData: versionData})
  }
}

export const addNewTableRow = (change, array) => {
  return (dispatch, getState) => {
    const maxDataId = (data) => (data.reduce((a, b) => a.data_id > b.data_id
      ? a.data_id
      : b.data_id))

    let versionData = getState().uploadFile.versionData
    if (!versionData) {
      dispatch({type: SET_ERROR, errorMessage: 'Unknown error! Seems no amp data is loaded!'})
      return
    }
    let newDataId = parseInt(maxDataId(versionData)) + 1
    let id = getState().uploadFile.lastNewID
      ? getState().uploadFile.lastNewID - 1
      : -1

    let newVersionItem = newVersionRow(newDataId, versionData[0], id)

    let newVersionData = getState()
      .uploadFile
      .versionData
      .concat([newVersionItem])
    dispatch({type: SET_LAST_NEWID, lastNewID: id})

    if (array) {
      array.push('files', newVersionItem)
    } else {
      console.warn('no array present')
    }

    return dispatch({type: SET_FILES,
      filesData: getTableData(newVersionData.filter(i => i.type.trim().toLowerCase() !== 'description'), getState),
      versionData: newVersionData})
  }
}

export const actions = {
  loadBrandsDropdown
}

// ------------------------------------ Action Handlers
// ------------------------------------
const ACTION_HANDLERS = {
  [UPLOAD_REQUEST]: (state, action) => state + action.payload,
  [UPLOAD_PUSH]: (state, action) => state,
  [UPLOAD_SAVE]: (state, action) => state,
  [BRANDS_DROPDOWN_REQUEST]: (state, action) => Object.assign({}, state, {isFetching: true}),
  [BRANDS_DROPDOWN_ERROR]: (state, action) => Object.assign({}, state, {
    isFetching: false,
    errorMessage: action.errorMessage,
    snackMessage: action.snackMessage
  }),
  [BRANDS_DROPDOWN_SUCCESS]: (state, action) => Object.assign({}, state, {
    isFetching: false,
    ampVersions: action.ampVersions,
    amps: action.amps,
    rawdata: action.rawdata
  }),
  [SET_BRAND]: (state, action) => Object.assign({}, state, {
    brand: action.brand,
    models: action.models
  }),
  [SET_MODEL]: (state, action) => Object.assign({}, state, {
    model: action.model,
    versions: action.versions
  }),
  [SET_VERSION]: (state, action) => Object.assign({}, state, {
    version: action.version,
    descriptionDb: action.descriptionDb,
    versionData: action.versionData,
    filesData: action.filesData,
    description: action.description,
    contributor: action.contributor
  }),
  [SET_FILES]: (state, action) => Object.assign({}, state, {
    filesData: action.filesData,
    versionData: action.versionData
      ? action.versionData
      : state.versionData,
    deletedFilesData: action.deletedFilesData
      ? action.deletedFilesData
      : state.deletedFilesData,
    deletedVersionData: action.deletedVersionData
      ? action.deletedVersionData
      : state.deletedVersionData
  }),
  [SET_ERROR]: (state, action) => Object.assign({}, state, {errorMessage: action.errorMessage}),
  [SET_LAST_NEWID]: (state, action) => Object.assign({}, state, {lastNewID: action.lastNewID})
}

// ------------------------------------ Reducer
// ------------------------------------
const initialState = {
  isFetching: false,
  snackMessage: '',
  errorMessage: '',
  amps: [],
  models: {},
  versions: {},
  rawdata: [],
  ampVersions: [],
  description: '',
  contributor: '',
  descriptionDb: '',
  filesData: [],
  deletedFilesData: [],
  deletedVersionData: []
}

export default function uploadFileReducer (state = initialState, action) {
  const handler = ACTION_HANDLERS[action.type]
  return handler
    ? handler(state, action)
    : state
}
