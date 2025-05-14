// controllers/schedulesController.js
import setupService from '../../services/crm/setupService.js';

// 모든 setup 가져오기
const getAllsetup = async (req, res) => {
    try {
        const setup = await setupService.getAllsetup();
        console.log('schedules', setup)
        res.json(setup);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
};

// 특정 setup 가져오기
const getSetupID = async (req, res) => {
    try {
        let result
        const { startDate, endDate, customerName, SearchMonth } = req.query;
        const { id } = req.params;


        switch (id) {
            case 'sales':
                result = await setupService.getTotalSales(SearchMonth);
                console.log('sales', result)
                break;

            case 'csKind':
            result = await setupService.getSetupID('csKind');
                console.log('csKind', result)
                break;
            case 'ADmedia':
            result = await setupService.getSetupID('ADmedia');
                console.log('ADmedia', result)
                break;
        }

        if (result) {
            res.json(result);
        } else {
            res.status(404).json({ error: 'Schedule not found' });
        }
    } catch (error) {

        res.status(500).json({ error: 'Failed to fetch getSetupTable' });
    }


};

export default {
    getAllsetup,
    getSetupID
    // createSchedule,
    // updateSchedule,
    // deleteSchedule,
};
