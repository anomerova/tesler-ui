import React, {FunctionComponent} from 'react'
import {connect} from 'react-redux'
import {Dispatch} from 'redux'
import {Store} from '../../../interfaces/store'
import {Operation, OperationGroup} from '../../../interfaces/operation'
import {WidgetTableMeta} from '../../../interfaces/widget'
import {buildBcUrl} from '../../../utils/strings'
import {Menu, Icon, Skeleton} from 'antd'
import {useWidgetOperations} from '../../../hooks'
import {$do} from '../../../actions/actions'
import {useTranslation} from 'react-i18next'
import styles from './RowOperations.less'

export interface RowOperationsOwnProps {
    widgetMeta: WidgetTableMeta,
    onClick?: () => void
}

export interface RowOperationsProps extends RowOperationsOwnProps {
    operations: (Operation | OperationGroup)[],
    metaInProgress?: boolean,
    onOperationClick: (bcName: string, operationType: string, widgetName: string) => void,
}

export const RowOperations: FunctionComponent<RowOperationsProps> = (props) => {
    const {t} = useTranslation()
    const operations = useWidgetOperations(props.operations, props.widgetMeta)
    const menuItemList: React.ReactNode[] = []
    operations.forEach((item: Operation | OperationGroup) => {
        if ((item as OperationGroup).actions) {
            const groupOperations: React.ReactNode[] = [];
            (item as OperationGroup).actions.forEach(operation => {
                if (operation.scope === 'record') {
                    groupOperations.push(
                        <Menu.Item
                            key={operation.type}
                            onClick={() => {
                                props.onOperationClick(props.widgetMeta.bcName, operation.type, props.widgetMeta.name)
                            }}
                        >
                            { operation.icon && <Icon type={operation.icon} /> }
                            {operation.text}
                        </Menu.Item>
                    )
                }
            })
            if (groupOperations.length) {
                menuItemList.push(
                    <Menu.ItemGroup key={item.type || item.text} title={item.text}>
                        {groupOperations}
                    </Menu.ItemGroup>
                )
            }
        }

        const ungroupedOperation = (item as Operation)
        if (ungroupedOperation.scope === 'record') {
            menuItemList.push(
                <Menu.Item
                    key={item.type}
                    onClick={() => {
                        if (props.onClick) {
                            props.onClick()
                        }
                        props.onOperationClick(props.widgetMeta.bcName, ungroupedOperation.type, props.widgetMeta.name)
                    }}
                >
                    { ungroupedOperation.icon && <Icon type={ungroupedOperation.icon} /> }
                    {item.text}
                </Menu.Item>
            )
        }
    })

    return <Menu>
        {props.metaInProgress
            ? <Menu.Item disabled>
                <div className={styles.floatMenuSkeletonWrapper}>
                    <Skeleton active />
                </div>
            </Menu.Item>
            : menuItemList.length
                ? menuItemList
                : <Menu.Item disabled>
                    {t('No operations available')}
                </Menu.Item>
        }
    </Menu>
}

function mapStateToProps(store: Store, ownProps: RowOperationsOwnProps) {
    const bcName = ownProps.widgetMeta.bcName
    const bcUrl = buildBcUrl(bcName, true)
    const operations = store.view.rowMeta[bcName]
    && store.view.rowMeta[bcName][bcUrl]
    && store.view.rowMeta[bcName][bcUrl].actions

    return {
        operations,
        metaInProgress: !!store.view.metaInProgress[bcName]
    }
}

function mapDispatchToProps(dispatch: Dispatch) {
    return {
        onOperationClick: (bcName: string, operationType: string, widgetName: string) => {
            dispatch($do.sendOperation({ bcName, operationType, widgetName }))
        }
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(RowOperations)
